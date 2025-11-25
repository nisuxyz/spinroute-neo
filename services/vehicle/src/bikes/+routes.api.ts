import { Hono } from 'hono';
import { requireAuth, getSupabase } from '../../lib/auth';
import {
  validateBikeType,
  validateUnit,
  validatePositiveNumber,
  milesToKm,
  convertMileageInObject,
  verifyOwnership,
  errorResponse,
} from '../../lib/utils';
import type { Database } from '../../lib/db.types';

export const basePath = '/api/bikes';
export const router = new Hono();

// Apply authentication to all routes
router.use('*', requireAuth());

/**
 * POST /api/bikes - Create a new bike
 */
router.post('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json(errorResponse('unauthorized', 'Authentication required'), 401);
    }

    const body = await c.req.json();
    const { name, type, brand, model, purchase_date, initial_mileage, unit, metadata } = body;

    // Validate required fields
    if (!name || !type) {
      return c.json(
        errorResponse('validation_error', 'Missing required fields', {
          required: ['name', 'type'],
        }),
        400,
      );
    }

    // Validate bike type
    if (!validateBikeType(type)) {
      return c.json(
        errorResponse('validation_error', 'Invalid bike type', {
          validTypes: ['road', 'mountain', 'hybrid', 'gravel', 'ebike', 'other'],
        }),
        400,
      );
    }

    // Validate and convert initial mileage if provided
    let mileageInKm = 0;
    if (initial_mileage !== undefined && initial_mileage !== null) {
      if (!validatePositiveNumber(initial_mileage) && initial_mileage !== 0) {
        return c.json(
          errorResponse('validation_error', 'Initial mileage must be a non-negative number'),
          400,
        );
      }

      const mileageUnit = unit || 'km';
      if (!validateUnit(mileageUnit)) {
        return c.json(
          errorResponse('validation_error', 'Invalid unit', {
            validUnits: ['km', 'mi'],
          }),
          400,
        );
      }

      mileageInKm = mileageUnit === 'mi' ? milesToKm(initial_mileage) : initial_mileage;
    }

    const supabase = getSupabase(c);

    // Insert bike
    const { data: bike, error } = await supabase
      .schema('vehicles')
      .from('user_bike')
      .insert({
        user_id: user.id,
        name,
        type: type as Database['vehicles']['Enums']['bike_type'],
        brand: brand || null,
        model: model || null,
        purchase_date: purchase_date || null,
        total_mileage: mileageInKm,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bike:', error);
      return c.json(errorResponse('database_error', 'Failed to create bike'), 500);
    }

    // Convert mileage for response if needed
    const responseUnit = unit || 'km';
    const responseBike = validateUnit(responseUnit)
      ? convertMileageInObject(bike, ['total_mileage'], responseUnit)
      : bike;

    return c.json(responseBike, 201);
  } catch (error) {
    console.error('Error in POST /api/bikes:', error);
    return c.json(errorResponse('internal_error', 'An unexpected error occurred'), 500);
  }
});

/**
 * GET /api/bikes - List user's bikes
 */
router.get('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json(errorResponse('unauthorized', 'Authentication required'), 401);
    }

    const includeParts = c.req.query('include_parts') === 'true';
    const unit = c.req.query('unit') || 'km';

    if (!validateUnit(unit)) {
      return c.json(
        errorResponse('validation_error', 'Invalid unit', {
          validUnits: ['km', 'mi'],
        }),
        400,
      );
    }

    const supabase = getSupabase(c);

    // Query bikes
    const { data: bikes, error } = await supabase
      .schema('vehicles')
      .from('user_bike')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bikes:', error);
      return c.json(errorResponse('database_error', 'Failed to fetch bikes'), 500);
    }

    // If include_parts is true, fetch installed parts for each bike
    let bikesWithParts = bikes;
    if (includeParts && bikes.length > 0) {
      const bikeIds = bikes.map((b) => b.id);

      // Get active installations
      const { data: installations, error: installError } = await supabase
        .schema('vehicles')
        .from('part_installation')
        .select('bike_id, part_id, user_part(*)')
        .in('bike_id', bikeIds)
        .is('removed_at', null);

      if (installError) {
        console.error('Error fetching installations:', installError);
      } else if (installations) {
        // Group parts by bike_id
        const partsByBike = installations.reduce((acc: Record<string, any[]>, inst: any) => {
          if (!acc[inst.bike_id]) acc[inst.bike_id] = [];
          acc?.[inst.bike_id]?.push(inst.user_part);
          return acc;
        }, {});

        bikesWithParts = bikes.map((bike) => ({
          ...bike,
          installed_parts: partsByBike[bike.id] || [],
        }));
      }
    }

    // Convert mileage for response
    const responseBikes = bikesWithParts.map((bike) =>
      convertMileageInObject(bike, ['total_mileage'], unit),
    );

    return c.json(responseBikes);
  } catch (error) {
    console.error('Error in GET /api/bikes:', error);
    return c.json(errorResponse('internal_error', 'An unexpected error occurred'), 500);
  }
});

/**
 * GET /api/bikes/:id - Get bike details
 */
router.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json(errorResponse('unauthorized', 'Authentication required'), 401);
    }

    const bikeId = c.req.param('id');
    const unit = c.req.query('unit') || 'km';

    if (!validateUnit(unit)) {
      return c.json(
        errorResponse('validation_error', 'Invalid unit', {
          validUnits: ['km', 'mi'],
        }),
        400,
      );
    }

    const supabase = getSupabase(c);

    // Fetch bike
    const { data: bike, error } = await supabase
      .schema('vehicles')
      .from('user_bike')
      .select('*')
      .eq('id', bikeId)
      .single();

    if (error || !bike) {
      return c.json(errorResponse('not_found', 'Bike not found'), 404);
    }

    // Verify ownership
    try {
      verifyOwnership(bike.user_id, user.id);
    } catch {
      return c.json(
        errorResponse('forbidden', 'You do not have permission to access this resource'),
        403,
      );
    }

    // Fetch installed parts
    const { data: installations, error: installError } = await supabase
      .schema('vehicles')
      .from('part_installation')
      .select('*, user_part(*)')
      .eq('bike_id', bikeId)
      .is('removed_at', null);

    if (installError) {
      console.error('Error fetching installations:', installError);
    }

    const installedParts = installations?.map((inst) => inst.user_part) || [];

    // Convert mileage for response
    const responseBike = convertMileageInObject(
      { ...bike, installed_parts: installedParts },
      ['total_mileage'],
      unit,
    );

    return c.json(responseBike);
  } catch (error) {
    console.error('Error in GET /api/bikes/:id:', error);
    return c.json(errorResponse('internal_error', 'An unexpected error occurred'), 500);
  }
});

/**
 * PATCH /api/bikes/:id - Update bike
 */
router.patch('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json(errorResponse('unauthorized', 'Authentication required'), 401);
    }

    const bikeId = c.req.param('id');
    const body = await c.req.json();
    const { name, type, brand, model, purchase_date, metadata } = body;

    const supabase = getSupabase(c);

    // Fetch bike to verify ownership
    const { data: existingBike, error: fetchError } = await supabase
      .schema('vehicles')
      .from('user_bike')
      .select('user_id')
      .eq('id', bikeId)
      .single();

    if (fetchError || !existingBike) {
      return c.json(errorResponse('not_found', 'Bike not found'), 404);
    }

    // Verify ownership
    try {
      verifyOwnership(existingBike.user_id, user.id);
    } catch {
      return c.json(
        errorResponse('forbidden', 'You do not have permission to access this resource'),
        403,
      );
    }

    // Validate type if provided
    if (type && !validateBikeType(type)) {
      return c.json(
        errorResponse('validation_error', 'Invalid bike type', {
          validTypes: ['road', 'mountain', 'hybrid', 'gravel', 'ebike', 'other'],
        }),
        400,
      );
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (brand !== undefined) updates.brand = brand;
    if (model !== undefined) updates.model = model;
    if (purchase_date !== undefined) updates.purchase_date = purchase_date;
    if (metadata !== undefined) updates.metadata = metadata;

    // Update bike
    const { data: updatedBike, error: updateError } = await supabase
      .schema('vehicles')
      .from('user_bike')
      .update(updates)
      .eq('id', bikeId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating bike:', updateError);
      return c.json(errorResponse('database_error', 'Failed to update bike'), 500);
    }

    return c.json(updatedBike);
  } catch (error) {
    console.error('Error in PATCH /api/bikes/:id:', error);
    return c.json(errorResponse('internal_error', 'An unexpected error occurred'), 500);
  }
});

/**
 * DELETE /api/bikes/:id - Delete bike
 */
router.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json(errorResponse('unauthorized', 'Authentication required'), 401);
    }

    const bikeId = c.req.param('id');
    const supabase = getSupabase(c);

    // Fetch bike to verify ownership
    const { data: existingBike, error: fetchError } = await supabase
      .schema('vehicles')
      .from('user_bike')
      .select('user_id')
      .eq('id', bikeId)
      .single();

    if (fetchError || !existingBike) {
      return c.json(errorResponse('not_found', 'Bike not found'), 404);
    }

    // Verify ownership
    try {
      verifyOwnership(existingBike.user_id, user.id);
    } catch {
      return c.json(
        errorResponse('forbidden', 'You do not have permission to access this resource'),
        403,
      );
    }

    // Delete bike (cascade deletes handled by DB)
    const { error: deleteError } = await supabase
      .schema('vehicles')
      .from('user_bike')
      .delete()
      .eq('id', bikeId);

    if (deleteError) {
      console.error('Error deleting bike:', deleteError);
      return c.json(errorResponse('database_error', 'Failed to delete bike'), 500);
    }

    return c.body(null, 204);
  } catch (error) {
    console.error('Error in DELETE /api/bikes/:id:', error);
    return c.json(errorResponse('internal_error', 'An unexpected error occurred'), 500);
  }
});

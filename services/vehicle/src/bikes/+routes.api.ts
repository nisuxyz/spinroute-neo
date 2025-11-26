import { Hono } from 'hono';
import { requireAuth, getSupabase } from '../../lib/auth';
import {
  validateBikeType,
  validateUnit,
  validatePositiveNumber,
  milesToKm,
  convertKilometrageInObject,
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
    const { name, type, brand, model, purchase_date, initial_kilometrage, unit, metadata } = body;

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

    // Validate and convert initial kilometrage if provided
    let kilometrageInKm = 0;
    if (initial_kilometrage !== undefined && initial_kilometrage !== null) {
      if (!validatePositiveNumber(initial_kilometrage) && initial_kilometrage !== 0) {
        return c.json(
          errorResponse('validation_error', 'Initial kilometrage must be a non-negative number'),
          400,
        );
      }

      const distanceUnit = unit || 'km';
      if (!validateUnit(distanceUnit)) {
        return c.json(
          errorResponse('validation_error', 'Invalid unit', {
            validUnits: ['km', 'mi'],
          }),
          400,
        );
      }

      kilometrageInKm =
        distanceUnit === 'mi' ? milesToKm(initial_kilometrage) : initial_kilometrage;
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
        total_kilometrage: kilometrageInKm,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bike:', error);
      return c.json(errorResponse('database_error', 'Failed to create bike'), 500);
    }

    // Convert kilometrage for response if needed
    const responseUnit = unit || 'km';
    const responseBike = validateUnit(responseUnit)
      ? convertKilometrageInObject(bike, ['total_kilometrage'], responseUnit)
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

    // Convert kilometrage for response
    const responseBikes = bikesWithParts.map((bike) =>
      convertKilometrageInObject(bike, ['total_kilometrage'], unit),
    );

    return c.json(responseBikes);
  } catch (error) {
    console.error('Error in GET /api/bikes:', error);
    return c.json(errorResponse('internal_error', 'An unexpected error occurred'), 500);
  }
});

/**
 * GET /api/bikes/active - Get user's active bike
 */
router.get('/active', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json(errorResponse('unauthorized', 'Authentication required'), 401);
    }

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

    // Get active bike ID from user_settings
    const { data: settings, error: settingsError } = await supabase
      .schema('public')
      .from('user_settings')
      .select('active_bike_id')
      .eq('id', user.id)
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching user settings:', settingsError);
      return c.json(errorResponse('database_error', 'Failed to fetch user settings'), 500);
    }

    // If no active bike ID, return null
    if (!settings?.active_bike_id) {
      return c.json(null);
    }

    // Query for the active bike
    const { data: bike, error } = await supabase
      .schema('vehicles')
      .from('user_bike')
      .select('*')
      .eq('id', settings.active_bike_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active bike:', error);
      return c.json(errorResponse('database_error', 'Failed to fetch active bike'), 500);
    }

    // If bike not found, return null
    if (!bike) {
      return c.json(null);
    }

    // Fetch installed parts for the active bike
    const { data: installations, error: installError } = await supabase
      .schema('vehicles')
      .from('part_installation')
      .select('*, user_part(*)')
      .eq('bike_id', bike.id)
      .is('removed_at', null);

    if (installError) {
      console.error('Error fetching installations:', installError);
    }

    const installedParts = installations?.map((inst) => inst.user_part) || [];

    // Convert kilometrage for response
    const responseBike = convertKilometrageInObject(
      { ...bike, installed_parts: installedParts },
      ['total_kilometrage'],
      unit,
    );

    return c.json(responseBike);
  } catch (error) {
    console.error('Error in GET /api/bikes/active:', error);
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

    // Convert kilometrage for response
    const responseBike = convertKilometrageInObject(
      { ...bike, installed_parts: installedParts },
      ['total_kilometrage'],
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

    // Delete bike
    // Note: If this bike is active, the FK constraint will automatically clear active_bike_id
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

/**
 * POST /api/bikes/:id/kilometrage - Log distance for bike
 */
router.post('/:id/kilometrage', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json(errorResponse('unauthorized', 'Authentication required'), 401);
    }

    const bikeId = c.req.param('id');
    const body = await c.req.json();
    const { distance, unit, logged_at, notes } = body;

    // Validate required fields
    if (distance === undefined || distance === null) {
      return c.json(errorResponse('validation_error', 'Missing required field: distance'), 400);
    }

    // Validate distance > 0
    if (!validatePositiveNumber(distance)) {
      return c.json(
        errorResponse('validation_error', 'Distance must be a positive number greater than 0'),
        400,
      );
    }

    // Validate unit parameter
    const distanceUnit = unit || 'km';
    if (!validateUnit(distanceUnit)) {
      return c.json(
        errorResponse('validation_error', 'Invalid unit', {
          validUnits: ['km', 'mi'],
        }),
        400,
      );
    }

    // Convert distance to km for storage
    const distanceInKm = distanceUnit === 'mi' ? milesToKm(distance) : distance;

    const supabase = getSupabase(c);

    // Fetch bike to verify ownership
    const { data: existingBike, error: fetchError } = await supabase
      .schema('vehicles')
      .from('user_bike')
      .select('user_id, total_kilometrage')
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

    // Increment bike total_kilometrage
    const newBikeTotalKm = existingBike.total_kilometrage + distanceInKm;
    const { data: updatedBike, error: updateBikeError } = await supabase
      .schema('vehicles')
      .from('user_bike')
      .update({
        total_kilometrage: newBikeTotalKm,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bikeId)
      .select()
      .single();

    if (updateBikeError) {
      console.error('Error updating bike kilometrage:', updateBikeError);
      return c.json(errorResponse('database_error', 'Failed to update bike kilometrage'), 500);
    }

    // Create kilometrage_log entry
    const loggedAtTimestamp = logged_at || new Date().toISOString();
    const { error: logError } = await supabase
      .schema('vehicles')
      .from('kilometrage_log')
      .insert({
        bike_id: bikeId,
        user_id: user.id,
        distance: distanceInKm,
        logged_at: loggedAtTimestamp,
        notes: notes || null,
      });

    if (logError) {
      console.error('Error creating kilometrage log:', logError);
      return c.json(errorResponse('database_error', 'Failed to create kilometrage log'), 500);
    }

    // Query all active part installations (removed_at IS NULL)
    const { data: installations, error: installError } = await supabase
      .schema('vehicles')
      .from('part_installation')
      .select('part_id, user_part(id, total_kilometrage)')
      .eq('bike_id', bikeId)
      .is('removed_at', null);

    if (installError) {
      console.error('Error fetching part installations:', installError);
      return c.json(errorResponse('database_error', 'Failed to fetch part installations'), 500);
    }

    // Increment total_kilometrage for each installed part
    const affectedParts = [];
    if (installations && installations.length > 0) {
      for (const installation of installations) {
        const part = installation.user_part as any;
        if (part) {
          const newPartTotalKm = part.total_kilometrage + distanceInKm;
          const { data: updatedPart, error: updatePartError } = await supabase
            .schema('vehicles')
            .from('user_part')
            .update({
              total_kilometrage: newPartTotalKm,
              updated_at: new Date().toISOString(),
            })
            .eq('id', part.id)
            .select()
            .single();

          if (updatePartError) {
            console.error('Error updating part kilometrage:', updatePartError);
            // Continue with other parts even if one fails
          } else if (updatedPart) {
            affectedParts.push(updatedPart);
          }
        }
      }
    }

    // Convert kilometrage values based on unit parameter for response
    const responseUnit = distanceUnit;
    const responseBike = convertKilometrageInObject(
      updatedBike,
      ['total_kilometrage'],
      responseUnit,
    );
    const responseParts = affectedParts.map((part) =>
      convertKilometrageInObject(part, ['total_kilometrage'], responseUnit),
    );

    return c.json({
      bike: responseBike,
      affected_parts: responseParts,
      logged_distance: responseUnit === 'mi' ? distance : distanceInKm,
      unit: responseUnit,
    });
  } catch (error) {
    console.error('Error in POST /api/bikes/:id/kilometrage:', error);
    return c.json(errorResponse('internal_error', 'An unexpected error occurred'), 500);
  }
});

/**
 * GET /api/bikes/:id/kilometrage - Get distance history
 */
router.get('/:id/kilometrage', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json(errorResponse('unauthorized', 'Authentication required'), 401);
    }

    const bikeId = c.req.param('id');
    const unit = c.req.query('unit') || 'km';
    const limitParam = c.req.query('limit');
    const offsetParam = c.req.query('offset');

    // Validate unit parameter
    if (!validateUnit(unit)) {
      return c.json(
        errorResponse('validation_error', 'Invalid unit', {
          validUnits: ['km', 'mi'],
        }),
        400,
      );
    }

    // Parse and validate pagination parameters
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;
    const offset = offsetParam ? Number.parseInt(offsetParam, 10) : 0;

    if (Number.isNaN(limit) || limit < 1 || limit > 1000) {
      return c.json(
        errorResponse('validation_error', 'Invalid limit parameter (must be between 1 and 1000)'),
        400,
      );
    }

    if (Number.isNaN(offset) || offset < 0) {
      return c.json(
        errorResponse('validation_error', 'Invalid offset parameter (must be non-negative)'),
        400,
      );
    }

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

    // Query kilometrage_log for bike_id, ordered by logged_at DESC
    const { data: logs, error: logsError } = await supabase
      .schema('vehicles')
      .from('kilometrage_log')
      .select('*')
      .eq('bike_id', bikeId)
      .order('logged_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (logsError) {
      console.error('Error fetching kilometrage logs:', logsError);
      return c.json(errorResponse('database_error', 'Failed to fetch kilometrage history'), 500);
    }

    // Convert distances based on unit parameter
    const responseLogs = logs.map((log) => convertKilometrageInObject(log, ['distance'], unit));

    return c.json({
      entries: responseLogs,
      pagination: {
        limit,
        offset,
        count: responseLogs.length,
      },
      unit,
    });
  } catch (error) {
    console.error('Error in GET /api/bikes/:id/kilometrage:', error);
    return c.json(errorResponse('internal_error', 'An unexpected error occurred'), 500);
  }
});

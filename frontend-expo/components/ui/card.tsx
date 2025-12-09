import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { GlassView } from 'expo-glass-effect';
import { useColorScheme, View, type ViewProps } from 'react-native';

function Card({
  className,
  isGlass = true,
  ...props
}: ViewProps & React.RefAttributes<View> & { isGlass?: boolean }) {
  const Wrapper = isGlass ? GlassView : View;
  const wrapperProps = isGlass ? { style: { borderRadius: 12 } } : {};
  const colorScheme = useColorScheme();
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <Wrapper {...wrapperProps}>
        <View
          className={cn(
            isGlass
              ? `flex flex-col gap-6 rounded-xl py-6 shadow-sm shadow-black/5 ${colorScheme === 'dark' ? '' : 'bg-background'}`
              : 'border-border flex flex-col gap-6 rounded-xl border py-6 shadow-sm shadow-black/5',
            className,
          )}
          {...props}
        />
      </Wrapper>
    </TextClassContext.Provider>
  );
}

function CardHeader({ className, ...props }: ViewProps & React.RefAttributes<View>) {
  return <View className={cn('flex flex-col gap-1.5 px-6', className)} {...props} />;
}

function CardTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<Text>) {
  return (
    <Text
      role="heading"
      aria-level={3}
      className={cn('font-semibold leading-none', className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<Text>) {
  return <Text className={cn('text-muted-foreground text-sm', className)} {...props} />;
}

function CardContent({ className, ...props }: ViewProps & React.RefAttributes<View>) {
  return <View className={cn('px-6', className)} {...props} />;
}

function CardFooter({ className, ...props }: ViewProps & React.RefAttributes<View>) {
  return <View className={cn('flex flex-row items-center px-6', className)} {...props} />;
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };

import { cn } from '@/lib/utils';
import { Platform, TextInput, type TextInputProps } from 'react-native';

type InputProps = TextInputProps &
  React.RefAttributes<TextInput> & {
    variant?: 'default' | 'ghost';
  };

const variantClasses: Record<NonNullable<InputProps['variant']>, string> = {
  default: 'dark:bg-input/30 border-input bg-background text-foreground shadow-sm shadow-black/5',
  ghost: 'bg-transparent border-transparent shadow-none text-foreground',
};

function Input({ className, placeholderClassName, variant = 'default', ...props }: InputProps) {
  return (
    <TextInput
      className={cn(
        'flex h-10 w-full min-w-0 flex-row items-center rounded-md border px-3 py-1 text-base leading-5 sm:h-9',
        variantClasses[variant],
        props.editable === false &&
          cn(
            'opacity-50',
            Platform.select({ web: 'disabled:pointer-events-none disabled:cursor-not-allowed' }),
          ),
        Platform.select({
          web: cn(
            'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground outline-none transition-[color,box-shadow] md:text-sm',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          ),
          native: 'placeholder:text-muted-foreground',
        }),
        className,
      )}
      {...props}
    />
  );
}

export { Input };

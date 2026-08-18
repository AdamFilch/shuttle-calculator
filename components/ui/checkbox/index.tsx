'use client';
import { PrimitiveIcon, UIIcon } from '@gluestack-ui/core/icon/creator';
import { createCheckbox } from '@gluestack-ui/core/checkbox/creator';
import {
  tva,
  useStyleContext,
  VariantProps,
  withStyleContext,
} from '@gluestack-ui/utils/nativewind-utils';
import { cssInterop } from 'nativewind';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

const SCOPE = 'CHECKBOX';

const UICheckbox = createCheckbox({
  Root: withStyleContext(Pressable, SCOPE),
  Group: View,
  Icon: UIIcon,
  Label: Text,
  Indicator: View,
});

cssInterop(PrimitiveIcon, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      height: true,
      width: true,
      fill: true,
      color: 'classNameColor',
      stroke: true,
    },
  },
});

const checkboxStyle = tva({
  base: 'group/checkbox flex-row items-center justify-start gap-2 data-[disabled=true]:opacity-40 data-[disabled=true]:web:cursor-not-allowed',
});

const checkboxIndicatorStyle = tva({
  base: 'justify-center items-center border-outline-400 bg-transparent rounded data-[hover=true]:border-outline-500 data-[hover=true]:bg-background-50 data-[hover=true]:data-[checked=true]:bg-primary-600 data-[hover=true]:data-[checked=true]:border-primary-600 data-[hover=true]:data-[disabled=true]:opacity-40 data-[hover=true]:data-[disabled=true]:border-outline-400 data-[hover=true]:data-[disabled=true]:data-[checked=true]:bg-transparent data-[active=true]:bg-background-100 data-[active=true]:data-[checked=true]:bg-primary-700 data-[active=true]:data-[checked=true]:border-primary-700 data-[checked=true]:bg-primary-500 data-[checked=true]:border-primary-500 data-[invalid=true]:border-error-700 data-[disabled=true]:opacity-40 border-2',
  variants: {
    size: {
      lg: 'w-6 h-6',
      md: 'w-5 h-5',
      sm: 'w-4 h-4',
    },
  },
});

const checkboxLabelStyle = tva({
  base: 'text-typography-600 data-[checked=true]:text-typography-900 data-[hover=true]:text-typography-900 data-[hover=true]:data-[checked=true]:text-typography-900 data-[active=true]:text-typography-900 data-[active=true]:data-[checked=true]:text-typography-900 data-[disabled=true]:text-typography-400 data-[disabled=true]:data-[checked=true]:text-typography-400 data-[invalid=true]:text-error-700',
  variants: {
    isTruncated: { true: 'web:truncate' },
    bold: { true: 'font-bold' },
    underline: { true: 'underline' },
    strikeThrough: { true: 'line-through' },
    size: {
      '2xs': 'text-2xs',
      'xs': 'text-xs',
      'sm': 'text-sm',
      'md': 'text-base',
      'lg': 'text-lg',
      'xl': 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
      '5xl': 'text-5xl',
      '6xl': 'text-6xl',
    },
    italic: { true: 'italic' },
    highlight: { true: 'bg-yellow-500' },
  },
});

const checkboxIconStyle = tva({
  base: 'text-typography-0 fill-none',
  parentVariants: {
    size: {
      '2xs': 'h-3 w-3',
      'xs': 'h-3.5 w-3.5',
      'sm': 'h-4 w-4',
      'md': 'h-[18px] w-[18px]',
      'lg': 'h-5 w-5',
      'xl': 'h-6 w-6',
    },
  },
});

const checkboxGroupStyle = tva({ base: 'gap-2' });

type ICheckboxProps = Omit<
  React.ComponentPropsWithoutRef<typeof UICheckbox>,
  'context'
> &
  VariantProps<typeof checkboxStyle> & {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
  };

/**
 * Single checkbox primitive following this repo's tva + compound-component
 * pattern. Controlled via `isChecked` / `onChange`, matching the
 * `isDisabled` / `isInvalid` boolean-prop naming used by Input/Button.
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof UICheckbox>,
  ICheckboxProps
>(function Checkbox({ className, size = 'md', ...props }, ref) {
  return (
    <UICheckbox
      ref={ref}
      {...props}
      className={checkboxStyle({ class: className })}
      context={{ size }}
    />
  );
});

type ICheckboxIndicatorProps = React.ComponentPropsWithoutRef<
  typeof UICheckbox.Indicator
> &
  VariantProps<typeof checkboxIndicatorStyle> & { className?: string };

const CheckboxIndicator = React.forwardRef<
  React.ElementRef<typeof UICheckbox.Indicator>,
  ICheckboxIndicatorProps
>(function CheckboxIndicator({ className, size, ...props }, ref) {
  const { size: parentSize } = useStyleContext(SCOPE);

  return (
    <UICheckbox.Indicator
      ref={ref}
      {...props}
      className={checkboxIndicatorStyle({
        size: size || parentSize,
        class: className,
      })}
    />
  );
});

type ICheckboxLabelProps = React.ComponentPropsWithoutRef<
  typeof UICheckbox.Label
> &
  VariantProps<typeof checkboxLabelStyle> & { className?: string };

const CheckboxLabel = React.forwardRef<
  React.ElementRef<typeof UICheckbox.Label>,
  ICheckboxLabelProps
>(function CheckboxLabel({ className, size, ...props }, ref) {
  const { size: parentSize } = useStyleContext(SCOPE);

  return (
    <UICheckbox.Label
      ref={ref}
      {...props}
      className={checkboxLabelStyle({
        size: size || parentSize,
        class: className,
      })}
    />
  );
});

type ICheckboxIconProps = React.ComponentPropsWithoutRef<
  typeof UICheckbox.Icon
> &
  VariantProps<typeof checkboxIconStyle> & {
    className?: string;
    height?: number;
    width?: number;
  };

const CheckboxIcon = React.forwardRef<
  React.ElementRef<typeof UICheckbox.Icon>,
  ICheckboxIconProps
>(function CheckboxIcon({ className, size, ...props }, ref) {
  const { size: parentSize } = useStyleContext(SCOPE);

  if (typeof size === 'number') {
    return (
      <UICheckbox.Icon
        ref={ref}
        {...props}
        className={checkboxIconStyle({ class: className })}
        size={size}
      />
    );
  } else if (
    (props.height !== undefined || props.width !== undefined) &&
    size === undefined
  ) {
    return (
      <UICheckbox.Icon
        ref={ref}
        {...props}
        className={checkboxIconStyle({ class: className })}
      />
    );
  }
  return (
    <UICheckbox.Icon
      ref={ref}
      {...props}
      className={checkboxIconStyle({
        parentVariants: { size: size || parentSize },
        class: className,
      })}
    />
  );
});

type ICheckboxGroupProps = React.ComponentPropsWithoutRef<
  typeof UICheckbox.Group
> & { className?: string };

const CheckboxGroup = React.forwardRef<
  React.ElementRef<typeof UICheckbox.Group>,
  ICheckboxGroupProps
>(function CheckboxGroup({ className, ...props }, ref) {
  return (
    <UICheckbox.Group
      ref={ref}
      {...props}
      className={checkboxGroupStyle({ class: className })}
    />
  );
});

Checkbox.displayName = 'Checkbox';
CheckboxIndicator.displayName = 'CheckboxIndicator';
CheckboxLabel.displayName = 'CheckboxLabel';
CheckboxIcon.displayName = 'CheckboxIcon';
CheckboxGroup.displayName = 'CheckboxGroup';

export { Checkbox, CheckboxGroup, CheckboxIcon, CheckboxIndicator, CheckboxLabel };

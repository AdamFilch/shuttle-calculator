import { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import React from 'react';
import type { ViewProps } from 'react-native';
import { View } from 'react-native';
import { hstackStyle } from './styles';

type IHStackProps = ViewProps &
  Omit<VariantProps<typeof hstackStyle>, "space"> & {
    space?: VariantProps<typeof hstackStyle>["space"] | number;
    className?: string;
  };

const HStack = React.forwardRef<React.ComponentRef<typeof View>, IHStackProps>(
  function HStack({ className, space, reversed, ...props }, ref) {
    return (
      <View
        className={`${hstackStyle({ space, reversed })} ${className ?? ""}`}
        {...props}
        ref={ref}
      />
    );
  }
);

HStack.displayName = 'HStack';

export { HStack };

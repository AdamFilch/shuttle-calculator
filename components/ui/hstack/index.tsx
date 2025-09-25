import { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import React from 'react';
import { View } from 'react-native';
import { hstackStyle } from './styles';


type IHStackProps = React.ComponentProps<typeof View> &
  VariantProps<typeof hstackStyle>;
const HStack = React.forwardRef<React.ComponentRef<typeof View>, IHStackProps>(
  function HStack({ className, space, reversed, ...props }, ref) {
    return (
      <View
        className={hstackStyle({ space, reversed, class: className })}
        {...props}
        ref={ref}
      />
    );
  }
);

HStack.displayName = 'HStack';

export { HStack };

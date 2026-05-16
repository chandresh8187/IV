import { View, Text } from 'react-native';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SupervisorStack } from './supervisor/SupervisorStack';

const Routes = () => {
  return (
    <NavigationContainer>
      <SupervisorStack />
    </NavigationContainer>
  );
};

export default Routes;

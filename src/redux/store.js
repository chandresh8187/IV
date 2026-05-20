import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/auth/authSlice';
import shiftReducer from './features/shift/shiftSlice';
export const store = configureStore({
  reducer: {
    auth: authReducer,
    shift: shiftReducer,
  },
});

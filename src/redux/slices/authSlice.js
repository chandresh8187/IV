import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  token: null,
  user: null,
  isLoading: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isLoading = false;
    },

    clearAuth: state => {
      state.token = null;
      state.user = null;
      state.isLoading = false;
    },

    stopLoading: state => {
      state.isLoading = false;
    },
  },
});

export const { setAuth, clearAuth, stopLoading } = authSlice.actions;

export default authSlice.reducer;

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

    setPermissions: (state, action) => {
      if (state.user) {
        state.user.permissions = Array.isArray(action.payload)
          ? action.payload
          : [];
      }
    },

    setUserAccess: (state, action) => {
      if (!state.user) return;

      const access = action.payload || {};
      if (Array.isArray(access.permissions)) {
        state.user.permissions = access.permissions;
      }
      if (access.role) state.user.role = access.role;
      if (Object.prototype.hasOwnProperty.call(access, 'assigned_shift')) {
        state.user.assigned_shift = access.assigned_shift;
      }
    },

    mergeUser: (state, action) => {
      if (state.user && action.payload) {
        state.user = { ...state.user, ...action.payload };
      }
    },

    stopLoading: state => {
      state.isLoading = false;
    },
  },
});

export const {
  setAuth,
  clearAuth,
  setPermissions,
  setUserAccess,
  mergeUser,
  stopLoading,
} = authSlice.actions;

export default authSlice.reducer;

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  dayProduction: 0,
  nightProduction: 0,
  totalProduction: 0,
  totalAmount: 0,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setDashboardData: (state, action) => {
      state.dayProduction = action.payload.dayProduction || 0;
      state.nightProduction = action.payload.nightProduction || 0;
      state.totalProduction = action.payload.totalProduction || 0;
      state.totalAmount = action.payload.totalAmount || 0;
    },
    clearDashboardData: () => initialState,
  },
});

export const { setDashboardData, clearDashboardData } = dashboardSlice.actions;
export default dashboardSlice.reducer;

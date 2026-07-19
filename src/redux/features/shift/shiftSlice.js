import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  shiftId: null,
  currentShift: null,
  shiftDate: null,
  isShiftActive: false,
  buttonText: 'Start day shift',
};

const shiftSlice = createSlice({
  name: 'shift',
  initialState,
  reducers: {
    setShiftStatus: (state, action) => {
      const data = action.payload;

      state.shiftId = data?.shift_id || null;
      state.currentShift = data?.current_shift || null;
      state.shiftDate = data?.shift_date || null;
      state.isShiftActive = data?.is_shift_active || false;
      state.buttonText = data?.button_text || 'Start day shift';
    },

    clearShiftStatus: state => {
      state.shiftId = null;
      state.currentShift = null;
      state.shiftDate = null;
      state.isShiftActive = false;
      state.buttonText = 'Start day shift';
    },
  },
});

export const { setShiftStatus, clearShiftStatus } = shiftSlice.actions;
export default shiftSlice.reducer;

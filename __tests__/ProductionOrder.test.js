import { sortProductionEntries } from '../src/utils/productionOrder';

const ids = rows => rows.map(row => row.id);

describe('production time ordering', () => {
  test('an earlier time moves above an entry saved first without mutating its ID or SR', () => {
    const rows = [
      { id: 41, sr_no: 1, production_time: '22:55:00' },
      { id: 42, sr_no: 2, production_time: '21:12:00' },
    ];
    expect(ids(sortProductionEntries(rows, 'night'))).toEqual([42, 41]);
    expect(ids(rows)).toEqual([41, 42]);
    expect(sortProductionEntries(rows)[0]).toBe(rows[1]);
    expect(rows[1].sr_no).toBe(2);
  });

  test('night shift keeps the following morning after evening, including 12-hour times', () => {
    const rows = [
      { id: 1, production_time: '12:05 AM' },
      { id: 2, production_time: '10:55 PM' },
      { id: 3, production_time: '07:10:00' },
      { id: 4, production_time: '09:12 PM' },
    ];
    expect(ids(sortProductionEntries(rows, 'night'))).toEqual([4, 2, 1, 3]);
  });

  test('day shift sorts normally and equal times use stable entry IDs, not serials', () => {
    const rows = [
      { id: 4, sr_no: 1, production_time: '13:00:00' },
      { id: 2, sr_no: 3, production_time: '09:12:00' },
      { id: 3, sr_no: 2, production_time: '13:00:00' },
    ];
    expect(ids(sortProductionEntries(rows, 'day'))).toEqual([2, 3, 4]);
    expect(ids(sortProductionEntries([...rows].reverse(), 'day'))).toEqual([
      2, 3, 4,
    ]);
  });

  test('history respects dates and shifts before sorting times', () => {
    const rows = [
      {
        id: 4,
        shift_date: '2026-09-14',
        shift_name: 'day',
        production_time: '09:00',
      },
      {
        id: 3,
        shift_date: '2026-09-13',
        shift_name: 'night',
        production_time: '01:00',
      },
      {
        id: 1,
        shift_date: '2026-09-13',
        shift_name: 'day',
        production_time: '11:00',
      },
      {
        id: 2,
        shift_date: '2026-09-13',
        shift_name: 'night',
        production_time: '22:00',
      },
    ];
    expect(ids(sortProductionEntries(rows))).toEqual([1, 2, 3, 4]);
  });

  test('missing or invalid times sort last and empty tables are supported', () => {
    expect(sortProductionEntries([])).toEqual([]);
    const rows = [
      { id: 1, production_time: null },
      { id: 2, production_time: '25:00' },
      { id: 3, production_time: '09:99' },
      { id: 4, production_time: '00:30 PM' },
      { id: 5, production_time: '10:30' },
    ];
    expect(ids(sortProductionEntries(rows))).toEqual([5, 1, 2, 3, 4]);
  });
});

import React from 'react';
import ProductionTable from './ProductionTable';

// Keep legacy report routes on the same register as live production and history.
export default function HistoryTable({ tableData = [] }) {
  return <ProductionTable rows={tableData} scrollRows />;
}

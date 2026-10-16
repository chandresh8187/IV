import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, UI } from '../assets/Colors';
import { zincKg } from '../utils/zincStock';

export default function ZincTransactionCard({ row }) {
  const summary = row.movement_type === 'production_summary';
  const label = summary ? Number(row.amount_kg) < 0 ? 'Production return (net)' : 'Production usage' : ({ receive: 'Zinc received in plant', transfer: 'Plant to kettle transfer', initialize: 'Opening balances', adjust: 'Stock correction' }[row.movement_type] || 'Stock movement');
  const date = String(row.transaction_date || row.created_at || '').slice(0, 10).split('-').reverse().join('/');
  return <View style={styles.card}>
    <Text style={styles.muted}>{date}{summary ? ` · ${row.shift_name === 'day' ? 'Day shift' : row.shift_name === 'night' ? 'Night shift' : 'Shift unavailable'}` : ''}</Text>
    <Text style={styles.heading}>{label} · {['initialize', 'adjust'].includes(row.movement_type) ? 'Balances set' : `${zincKg(Math.abs(Number(row.amount_kg)))} kg`}</Text>
    {summary ? <Text style={styles.muted}>Net usage after returns and corrections.{row.shift_name === 'unavailable' ? ' Legacy record: recorded date shown.' : ''}</Text> : <>
      <Text style={styles.muted}>Balances after movement: Plant {zincKg(row.plant_after_kg)} kg · Kettle {zincKg(row.kettle_after_kg)} kg</Text>
      {row.batch_number ? <Text>Batch: {row.batch_number}</Text> : null}
      {row.invoice_number ? <Text>Invoice: {row.invoice_number}</Text> : null}
      {row.zinc_rate_per_kg != null ? <Text>Purchase rate: ₹{Number(row.zinc_rate_per_kg).toFixed(2)} / kg</Text> : null}
      {row.actor_name ? <Text style={styles.muted}>Recorded by: {row.actor_name}</Text> : null}
      {row.note ? <Text style={styles.muted}>{row.note}</Text> : null}
    </>}
    {row.movement_type !== 'receive' && (row.batch_allocations || []).map((batch, index) => <View key={`${batch.lot_key || index}`} style={styles.batch}>
      <Text style={styles.heading}>{Number(batch.amount_kg) < 0 ? 'Returned' : summary ? 'Used' : 'Transferred'} {zincKg(Math.abs(Number(batch.amount_kg)))} kg</Text>
      {batch.receipt_id != null ? <><Text>Batch: {batch.batch_number || 'Not recorded'}</Text><Text>Invoice: {batch.invoice_number || 'Not recorded'}</Text></> : <Text style={styles.muted}>{batch.source_label || 'Unreferenced stock'}</Text>}
    </View>)}
  </View>;
}
const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: 900, backgroundColor: COLORS.white, borderRadius: UI.radius, padding: 18, gap: 10 },
  heading: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  muted: { color: COLORS.muted, fontSize: 13, lineHeight: 20 },
  batch: { padding: 12, gap: 6, borderRadius: UI.radiusSmall, backgroundColor: COLORS.surfaceMuted },
});

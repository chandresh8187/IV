import React from 'react';
import { View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Polygon,
  Line,
  Text as SvgText,
} from 'react-native-svg';

export default function ZincTankVisual({
  levelMm = 0,
  depthMm = 1250,
  initialized = true,
}) {
  const fraction = initialized
    ? Math.max(0, Math.min(1, levelMm / depthMm))
    : 0;
  const surfaceY = 205 - 125 * fraction;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        initialized
          ? `Kettle tank, estimated zinc level ${levelMm.toFixed(
              1,
            )} millimetres of ${depthMm} millimetres`
          : 'Kettle tank, opening stock not set'
      }
    >
      <Svg width="100%" height={250} viewBox="0 0 430 265">
        <Defs>
          <LinearGradient id="tankSteel" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#CBD5E1" />
            <Stop offset="1" stopColor="#64748B" />
          </LinearGradient>
          <LinearGradient id="liquidZinc" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#A5F3FC" />
            <Stop offset="1" stopColor="#0891B2" />
          </LinearGradient>
        </Defs>
        <Polygon points="35,205 290,205 350,170 95,170" fill="#475569" />
        <Polygon
          points="95,45 350,45 350,170 95,170"
          fill="url(#tankSteel)"
          stroke="#64748B"
        />
        <Polygon
          points="35,80 95,45 95,170 35,205"
          fill="#94A3B8"
          stroke="#64748B"
        />
        {fraction > 0 && (
          <>
            <Polygon
              points={`35,${surfaceY} 290,${surfaceY} 290,205 35,205`}
              fill="url(#liquidZinc)"
            />
            <Polygon
              points={`290,${surfaceY} 350,${surfaceY - 35} 350,170 290,205`}
              fill="#0E7490"
            />
            <Polygon
              points={`35,${surfaceY} 290,${surfaceY} 350,${surfaceY - 35} 95,${
                surfaceY - 35
              }`}
              fill="#CFFAFE"
              stroke="#22D3EE"
            />
            <Line
              x1="65"
              y1={surfaceY - 8}
              x2="270"
              y2={surfaceY - 8}
              stroke="#FFFFFF"
              strokeWidth="2"
              opacity="0.7"
            />
          </>
        )}
        <Polygon
          points="35,80 290,80 290,205 35,205"
          fill="#CBD5E1"
          fillOpacity="0.12"
          stroke="#475569"
          strokeWidth="2"
        />
        <Polygon
          points="290,80 350,45 350,170 290,205"
          fill="#CBD5E1"
          fillOpacity="0.1"
          stroke="#475569"
          strokeWidth="2"
        />
        <Polygon
          points="35,80 290,80 350,45 95,45"
          fill="none"
          stroke="#334155"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <Line x1="368" y1="80" x2="368" y2="205" stroke="#64748B" />
        {[0, 250, 500, 750, 1000, 1250].map(mm => {
          const y = 205 - (mm / depthMm) * 125;
          return (
            <React.Fragment key={mm}>
              <Line x1="363" y1={y} x2="373" y2={y} stroke="#64748B" />
              <SvgText x="379" y={y + 4} fontSize="10" fill="#475569">
                {mm}
              </SvgText>
            </React.Fragment>
          );
        })}
        <SvgText x="370" y="64" fontSize="11" fill="#475569">
          mm
        </SvgText>
        <SvgText x="135" y="233" fontSize="13" fill="#475569">
          Length 5 m
        </SvgText>
        <SvgText x="281" y="25" fontSize="12" fill="#475569">
          Width 1 m
        </SvgText>
        <SvgText x="92" y="255" fontSize="11" fill="#64748B">
          Cutaway view · Depth 1,250 mm
        </SvgText>
      </Svg>
    </View>
  );
}

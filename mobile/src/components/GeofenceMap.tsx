import { View } from 'react-native';
import MapView, { Circle, Marker, type MapPressEvent, type Region } from 'react-native-maps';
import { colors, radius } from '@/theme';

export const GEOFENCE_RADIUS_M = 500;

type Coordinates = {
  latitude: number;
  longitude: number;
};

type GeofenceMapProps = {
  coordinates: Coordinates;
  onChange: (coordinates: Coordinates) => void;
};

export function GeofenceMap({ coordinates, onChange }: GeofenceMapProps) {
  const region: Region = {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  const handlePress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    onChange({ latitude, longitude });
  };

  return (
    <View
      testID="geofence-map"
      style={{
        height: 220,
        borderRadius: radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border.default,
      }}
    >
      <MapView style={{ flex: 1 }} initialRegion={region} onPress={handlePress}>
        <Marker
          coordinate={coordinates}
          draggable
          onDragEnd={(event) => {
            const { latitude, longitude } = event.nativeEvent.coordinate;
            onChange({ latitude, longitude });
          }}
        />
        <Circle
          center={coordinates}
          radius={GEOFENCE_RADIUS_M}
          strokeColor={colors.brand.primary}
          fillColor="rgba(130,102,255,0.18)"
          strokeWidth={2}
        />
      </MapView>
    </View>
  );
}

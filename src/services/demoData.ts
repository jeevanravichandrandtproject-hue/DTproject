import { DeviceMetadata } from '../types/floodguard';
import { DEFAULT_DEVICE_ID } from '../utils/telemetry';

export function createDefaultDeviceMetadata(deviceId: string = DEFAULT_DEVICE_ID): DeviceMetadata {
  return {
    deviceId,
    deviceName: 'Tiruvallur Drainage Node 01',
    location: 'Tiruvallur, Tamil Nadu, India',
    coordinates: undefined,
    installationDetails: 'Stormwater culvert monitor — ESP32 + HC-SR04 Ultrasonic + DHT11',
    reportingIntervalSec: 2,
    offlineTimeoutSec: 15,
    createdAt: Date.now(),
  };
}

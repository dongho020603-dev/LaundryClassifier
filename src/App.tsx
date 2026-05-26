import React, {useState} from 'react';
import {StatusBar} from 'react-native';
import HomeScreen from './screens/HomeScreen';
import CameraScreen from './screens/CameraScreen';
import ResultScreen from './screens/ResultScreen';
import WarehouseScreen from './screens/WarehouseScreen';
import {Colors} from './theme/tokens';

type Screen = 'home' | 'camera' | 'result' | 'warehouse';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedImageUri, setSelectedImageUri] = useState<string>('');

  const handleOpenCamera = () => setCurrentScreen('camera');
  const handleOpenWarehouse = () => setCurrentScreen('warehouse');
  const handleCloseCamera = () => setCurrentScreen('home');

  const handlePhotoTaken = (uri: string) => {
    const full = uri.startsWith('file://') ? uri : `file://${uri}`;
    setSelectedImageUri(full);
    setCurrentScreen('result');
  };

  const handleImageSelected = (uri: string) => {
    setSelectedImageUri(uri);
    setCurrentScreen('result');
  };

  const handleBackToHome = () => {
    setSelectedImageUri('');
    setCurrentScreen('home');
  };

  const handleRetake = () => {
    setSelectedImageUri('');
    setCurrentScreen('camera');
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      {currentScreen === 'home' && (
        <HomeScreen
          onOpenCamera={handleOpenCamera}
          onOpenWarehouse={handleOpenWarehouse}
        />
      )}
      {currentScreen === 'camera' && (
        <CameraScreen
          onPhotoTaken={handlePhotoTaken}
          onImageSelected={handleImageSelected}
          onClose={handleCloseCamera}
        />
      )}
      {currentScreen === 'result' && (
        <ResultScreen
          imageUri={selectedImageUri}
          onBackToHome={handleBackToHome}
          onRetake={handleRetake}
        />
      )}
      {currentScreen === 'warehouse' && (
        <WarehouseScreen onBack={handleBackToHome} />
      )}
    </>
  );
}

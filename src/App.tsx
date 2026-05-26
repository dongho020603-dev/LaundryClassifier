import React, {useState} from 'react';
import {StatusBar} from 'react-native';
import HomeScreen from './screens/HomeScreen';
import CameraScreen from './screens/CameraScreen';
import ModelDebugScreen from './screens/ModelDebugScreen';
import ResultScreen from './screens/ResultScreen';

type Screen = 'home' | 'camera' | 'modelDebug' | 'result';

interface DetectionResult {
  label: string;
  confidence: number;
  classId: number;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedImageUri, setSelectedImageUri] = useState<string>('');
  const [resizedImageUri, setResizedImageUri] = useState<string>('');
  const [detections, setDetections] = useState<DetectionResult[]>([]);

  const handleOpenCamera = () => {
    setCurrentScreen('camera');
  };

  const handlePhotoTaken = (uri: string) => {
    // vision-camera는 file:// 없이 경로를 반환하므로 추가
    const fullUri = uri.startsWith('file://') ? uri : `file://${uri}`;
    setSelectedImageUri(fullUri);
    setCurrentScreen('modelDebug');
  };

  const handleImageSelected = (uri: string) => {
    setSelectedImageUri(uri);
    setCurrentScreen('modelDebug');
  };

  const handleResizedImageReady = (uri: string) => {
    setResizedImageUri(uri);
  };

  const handleContinueToResult = (dets?: DetectionResult[]) => {
    if (dets) {
      setDetections(dets);
    }
    setCurrentScreen('result');
  };

  const handleRetakeFromDebug = () => {
    setCurrentScreen('home');
    setSelectedImageUri('');
    setDetections([]);
  };

  const handleRetakeFromResult = () => {
    setCurrentScreen('home');
    setSelectedImageUri('');
    setDetections([]);
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
    setSelectedImageUri('');
    setDetections([]);
  };

  const handleCloseCamera = () => {
    setCurrentScreen('home');
  };

  return (
    <>
      <StatusBar
        barStyle={currentScreen === 'camera' ? 'light-content' : 'dark-content'}
        backgroundColor={currentScreen === 'camera' ? '#000' : '#fafafa'}
      />
      {currentScreen === 'home' && (
        <HomeScreen
          onImageSelected={handleImageSelected}
          onOpenCamera={handleOpenCamera}
        />
      )}
      {currentScreen === 'camera' && (
        <CameraScreen
          onPhotoTaken={handlePhotoTaken}
          onClose={handleCloseCamera}
        />
      )}
      {currentScreen === 'modelDebug' && (
        <ModelDebugScreen
          imageUri={selectedImageUri}
          onContinue={handleContinueToResult}
          onRetake={handleRetakeFromDebug}
          onResizedImageReady={handleResizedImageReady}
        />
      )}
      {currentScreen === 'result' && (
        <ResultScreen
          imageUri={resizedImageUri || selectedImageUri}
          detections={detections}
          onBackToHome={handleBackToHome}
          onRetake={handleRetakeFromResult}
        />
      )}
    </>
  );
}

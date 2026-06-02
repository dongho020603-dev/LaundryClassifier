import React, {useState, useEffect, useCallback} from 'react';
import {StatusBar, BackHandler} from 'react-native';
import HomeScreen from './screens/HomeScreen';
import CameraScreen from './screens/CameraScreen';
import ResultScreen from './screens/ResultScreen';
import SaveScreen from './screens/SaveScreen';
import ClosetScreen from './screens/ClosetScreen';

type Screen = 'home' | 'camera' | 'result' | 'save' | 'closet' | 'closet-detail';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedImageUri, setSelectedImageUri] = useState<string>('');
  // 저장용: ResultScreen에서 넘겨받을 데이터
  const [saveLabels, setSaveLabels] = useState<string[]>([]);
  const [saveOverallState, setSaveOverallState] = useState<string>('safe');
  // 옷장 상세 보기용
  const [closetDetailLabels, setClosetDetailLabels] = useState<string[]>([]);

  const handleOpenCamera = () => {
    setCurrentScreen('camera');
  };

  const handlePhotoTaken = (uri: string) => {
    const fullUri = uri.startsWith('file://') ? uri : `file://${uri}`;
    setSelectedImageUri(fullUri);
    setCurrentScreen('result');
  };

  const handleRetake = () => {
    setCurrentScreen('home');
    setSelectedImageUri('');
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
    setSelectedImageUri('');
  };

  const handleCloseCamera = () => {
    setCurrentScreen('home');
  };

  const handleOpenCloset = () => {
    setCurrentScreen('closet');
  };

  const handleViewClosetDetail = (labels: string[]) => {
    setClosetDetailLabels(labels);
    setCurrentScreen('closet-detail');
  };

  const handleSaveToCloset = (labels: string[], overallState: string) => {
    setSaveLabels(labels);
    setSaveOverallState(overallState);
    setCurrentScreen('save');
  };

  const handleSaved = () => {
    setCurrentScreen('home');
    setSelectedImageUri('');
  };

  // Android 하드웨어 뒤로가기 버튼
  const handleBackPress = useCallback(() => {
    switch (currentScreen) {
      case 'home':
        return false; // 기본 동작 (앱 종료)
      case 'camera':
        setCurrentScreen('home');
        return true;
      case 'result':
        handleBackToHome();
        return true;
      case 'save':
        setCurrentScreen('result');
        return true;
      case 'closet':
        handleBackToHome();
        return true;
      case 'closet-detail':
        setCurrentScreen('closet');
        return true;
      default:
        return false;
    }
  }, [currentScreen]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => sub.remove();
  }, [handleBackPress]);

  const isDark = currentScreen === 'camera';

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#000' : '#fff'}
      />
      {currentScreen === 'home' && (
        <HomeScreen
          onOpenCamera={handleOpenCamera}
          onOpenCloset={handleOpenCloset}
        />
      )}
      {currentScreen === 'camera' && (
        <CameraScreen
          onPhotoTaken={handlePhotoTaken}
          onClose={handleCloseCamera}
        />
      )}
      {currentScreen === 'result' && (
        <ResultScreen
          imageUri={selectedImageUri}
          onBackToHome={handleBackToHome}
          onRetake={handleRetake}
          onSaveToCloset={handleSaveToCloset}
        />
      )}
      {currentScreen === 'save' && (
        <SaveScreen
          labels={saveLabels}
          overallState={saveOverallState}
          onSaved={handleSaved}
          onBack={() => setCurrentScreen('result')}
        />
      )}
      {currentScreen === 'closet' && (
        <ClosetScreen
          onBack={handleBackToHome}
          onViewDetail={handleViewClosetDetail}
        />
      )}
      {currentScreen === 'closet-detail' && (
        <ResultScreen
          imageUri=""
          onBackToHome={() => setCurrentScreen('closet')}
          onRetake={() => setCurrentScreen('closet')}
          preloadedLabels={closetDetailLabels}
        />
      )}
    </>
  );
}

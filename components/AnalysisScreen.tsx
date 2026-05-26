import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
// import * as tf from '@tensorflow/tfjs';
// import '@tensorflow/tfjs-react-native';

export default function AnalysisScreen() {
  const { photoUri } = useLocalSearchParams();
  const [analyzing, setAnalyzing] = useState(true);
  const [result, setResult] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // AI 모델 분석 시뮬레이션
    const analyzeImage = async () => {
      // 실제로는 TensorFlow.js로 모델 로드하고 분석
      // 예: const model = await tf.loadLayersModel('path/to/model');
      // const predictions = await model.predict(processedImage);
      setTimeout(() => {
        // 가짜 결과
        setResult('세탁기 가능: 예, 세탁 온도: 30°C');
        setAnalyzing(false);
        // 결과 화면으로 이동
        setTimeout(() => {
          router.push({ pathname: '/result', params: { result: '세탁기 가능: 예, 세탁 온도: 30°C' } });
        }, 1000);
      }, 3000); // 3초 분석 시뮬레이션
    };
    analyzeImage();
  }, [photoUri, router]);

  return (
    <View style={styles.container}>
      <Image source={{ uri: photoUri }} style={styles.image} />
      {analyzing ? (
        <Text style={styles.text}>AI 모델 분석 중...</Text>
      ) : (
        <Text style={styles.text}>분석 완료: {result}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
  },
});
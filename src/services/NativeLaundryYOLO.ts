import {NativeModules} from 'react-native';

const {LaundryYOLO} = NativeModules;

export interface Detection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  classId: number;
  bbox: number[];
}

export interface InferenceResult {
  detections: Detection[];
  count: number;
  inferenceTime: number;
}

class NativeLaundryYOLO {
  static async loadModel(): Promise<string> {
    return await LaundryYOLO.loadModel();
  }

  static async detect(imagePath: string): Promise<InferenceResult> {
    const cleanPath = imagePath.replace('file://', '');
    return await LaundryYOLO.runInference(cleanPath);
  }
}

export default NativeLaundryYOLO;

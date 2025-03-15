'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, Image as ImageIcon, Scan } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoadingProgressProps {
  isUploading?: boolean;
  isProcessing?: boolean;
}

export function LoadingProgress({ 
  isUploading = false, 
  isProcessing = false 
}: LoadingProgressProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Подготовка...');
  const [step, setStep] = useState<'uploading' | 'processing'>('uploading');

  // Имитация прогресса загрузки и обработки
  useEffect(() => {
    if (!isUploading && !isProcessing) {
      setProgress(0);
      return;
    }

    let interval: NodeJS.Timeout;
    
    if (isUploading) {
      setStep('uploading');
      setStatus('Загрузка изображения...');
      // Быстрый прогресс для загрузки (до 40%)
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 40) return prev + 2;
          return prev;
        });
      }, 100);
    } else if (isProcessing) {
      setStep('processing');
      setStatus('Анализ изображения...');
      // Более медленный прогресс для обработки (от 40% до 90%)
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 90) return prev + 0.5;
          return prev;
        });
      }, 200);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isUploading, isProcessing]);

  // Функция для определения подробного статуса в зависимости от прогресса
  const getDetailedStatus = () => {
    if (step === 'uploading') {
      if (progress < 15) return 'Подготовка файла...';
      if (progress < 30) return 'Отправка на сервер...';
      return 'Завершение загрузки...';
    } else { // processing
      if (progress < 50) return 'Начало анализа...';
      if (progress < 70) return 'Обработка изображения...';
      if (progress < 85) return 'Распознавание лиц...';
      return 'Финальная проверка...';
    }
  };

  // Анимация для иконки
  const iconAnimation = {
    animate: {
      rotate: [0, 360],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  return (
    <Card className="w-full mt-6">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3">
          <motion.div
            animate="animate"
            variants={iconAnimation}
            className="text-primary"
          >
            {step === 'uploading' ? (
              <Upload className="h-5 w-5" />
            ) : (
              <Scan className="h-5 w-5" />
            )}
          </motion.div>
          <span className="flex-1">{status}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Progress 
            value={progress} 
            className="h-3 w-full" 
          />
          
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {getDetailedStatus()}
            </p>
            <motion.p 
              className="font-medium text-right"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              {Math.round(progress)}%
            </motion.p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 
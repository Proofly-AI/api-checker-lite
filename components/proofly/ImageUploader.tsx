'use client';

import { useState, useCallback, forwardRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Image as ImageIcon, X, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Анимации
const fadeIn = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0, 
    y: -15,
    transition: { duration: 0.2 }
  }
};

interface ImageUploaderProps {
  onUpload: (file: File) => void;
  isLoading?: boolean;
}

export function ImageUploader({ onUpload, isLoading = false }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      console.log('ImageUploader: No files were accepted');
      return;
    }

    const file = acceptedFiles[0];
    console.log('ImageUploader: File accepted', { name: file.name, size: file.size, type: file.type });
    
    // Проверяем размер файла (максимум 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.error('ImageUploader: File size exceeds 10MB limit', { size: file.size });
      toast.error('Размер файла превышает 10MB');
      return;
    }

    // Проверяем тип файла (только изображения)
    if (!file.type.startsWith('image/')) {
      console.error('ImageUploader: Invalid file type', { type: file.type });
      toast.error('Выберите файл изображения');
      return;
    }

    // Создаем превью
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setSelectedFile(file);
    console.log('ImageUploader: Preview created', { url: objectUrl });

    // Очищаем URL при размонтировании компонента
    return () => URL.revokeObjectURL(objectUrl);
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    disabled: isLoading
  });

  const resetSelection = useCallback(() => {
    console.log('ImageUploader: Removing selected file');
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setSelectedFile(null);
  }, [preview]);

  // Форматирование размера файла
  const formatFileSize = (size: number | undefined): string => {
    if (size === undefined) return '0 МБ';
    return (size / 1024 / 1024).toFixed(2) + ' МБ';
  };
  
  // Обработчик загрузки файла
  const handleUpload = () => {
    if (!selectedFile) {
      console.error('ImageUploader: No file selected for upload');
      toast.error('Выберите файл для загрузки');
      return;
    }
    
    console.log('ImageUploader: Starting upload', { name: selectedFile.name, size: selectedFile.size });
    onUpload(selectedFile);
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeIn}
    >
      <Card className="w-full">
        <CardContent className="pt-6">
          <div 
            {...getRootProps()} 
            className={cn(
              "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all",
              isDragActive ? "border-primary bg-primary/10" : "border-gray-300 hover:border-primary hover:bg-gray-50/50 dark:hover:bg-gray-900/10",
              isLoading ? "opacity-50 cursor-not-allowed" : "",
              preview ? "py-6" : "py-12"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                {preview ? (
                  <motion.div 
                    key="preview-info"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center space-x-2"
                  >
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {selectedFile?.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({formatFileSize(selectedFile?.size)})
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="upload-icon"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Upload className="h-12 w-12 text-gray-400" />
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="mt-2 text-sm text-gray-600">
                {isDragActive
                  ? "Отпустите для загрузки"
                  : preview
                  ? "Перетащите другое изображение или нажмите для выбора"
                  : "Перетащите изображение сюда или нажмите для выбора"}
              </p>
              {isLoading && (
                <motion.p 
                  className="mt-2 text-sm text-gray-600"
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Загрузка...
                </motion.p>
              )}
            </div>
          </div>
          
          {preview && (
            <motion.div 
              className="mt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="relative">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <div className="group relative rounded-lg overflow-hidden border">
                    <motion.img 
                      src={preview} 
                      alt="Preview" 
                      className="mx-auto max-h-64 w-full object-contain"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <DialogTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8">
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                    </div>
                  </div>
                  <DialogContent className="max-w-3xl p-0 overflow-hidden">
                    <img
                      src={preview}
                      alt="Preview Fullsize"
                      className="w-full h-auto max-h-[80vh] object-contain"
                    />
                  </DialogContent>
                </Dialog>
                {!isLoading && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      resetSelection();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {selectedFile && (
                <div className="mt-2 text-xs text-muted-foreground flex justify-between">
                  <span>{selectedFile.name}</span>
                  <span>
                    {selectedFile.type.split('/')[1].toUpperCase()} • {formatFileSize(selectedFile.size)}
                  </span>
                </div>
              )}
              
              {/* Кнопка отправки файла */}
              <motion.div 
                className="mt-4 flex justify-center"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleUpload}
                  disabled={isLoading || !selectedFile}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                      Загрузка...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Отправить на анализ
                    </span>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
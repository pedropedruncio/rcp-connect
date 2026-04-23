import React, { useState, useRef } from 'react';
import { UploadCloud, X, Camera } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ImageUploadProps {
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  className?: string;
  aspect?: 'square' | 'video' | 'portrait';
}

export default function ImageUpload({ 
  label, 
  value, 
  onChange, 
  className,
  aspect = 'square' 
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      onChange(url);
    }
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</label>}
      
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed border-outline-variant rounded-lg overflow-hidden cursor-pointer transition-all",
          "hover:border-gold/50 hover:bg-gold/[0.02] group",
          aspect === 'square' ? "aspect-square w-40" : aspect === 'video' ? "aspect-video w-full" : "aspect-[3/4] w-48",
          !preview && "flex flex-col items-center justify-center p-4"
        )}
      >
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <button 
              onClick={clear}
              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors z-10"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <>
            <UploadCloud className="w-8 h-8 text-slate-300 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight text-center">Clique p/ Upload</p>
          </>
        )}
        
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
}

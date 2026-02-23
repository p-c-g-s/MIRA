import { useState, useRef, useEffect } from "react";

interface TextInputProps {
  x: number;
  y: number;
  color: string;
  fontSize: number;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export function TextInput({ x, y, color, fontSize, onSubmit, onCancel }: TextInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (text.trim()) {
        onSubmit(text.trim());
      } else {
        onCancel();
      }
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const handleBlur = () => {
    if (text.trim()) {
      onSubmit(text.trim());
    } else {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="absolute bg-transparent outline-none border-b border-white/50 px-1 py-0.5"
      style={{
        left: x,
        top: y,
        color,
        fontSize: `${fontSize * 3}px`,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: 500,
        minWidth: '100px',
        transform: 'translateY(-50%)',
      }}
      placeholder="Type..."
    />
  );
}

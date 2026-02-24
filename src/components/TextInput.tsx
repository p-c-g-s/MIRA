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
  const submittedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      submittedRef.current = true;
      if (text.trim()) {
        onSubmit(text.trim());
      } else {
        onCancel();
      }
    } else if (e.key === "Escape") {
      submittedRef.current = true;
      onCancel();
    }
  };

  const handleBlur = () => {
    if (submittedRef.current) return;
    if (text.trim()) {
      onSubmit(text.trim());
    } else {
      onCancel();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onClick={handleClick}
      onMouseDown={handleClick}
      className="absolute bg-transparent outline-none px-1 py-0.5"
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

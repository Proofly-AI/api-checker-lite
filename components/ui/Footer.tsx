import React from 'react';

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 py-4 text-center text-xs text-muted-foreground bg-background">
      <p className="mb-1">
        Made by <a href="https://check.proofly.ai" target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">Proofly</a> to defend you with <span className="material-symbols-outlined inline-block align-middle group-hover:text-red-400 transition-colors duration-200" style={{ fontSize: '12px', lineHeight: '1', transform: 'translateY(-1px)' }}>favorite</span>. {new Date().getFullYear()}
      </p>
      <p className="text-xs">
        Free to use: <a href="https://t.ly/proofly_chrome" target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">Chrome Plugin</a> with <a href="https://www.x.com" target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">X</a> support, <a href="https://t.me/ProoflyAIBot" target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">Telegram Bot</a> or <a href="https://get.proofly.ai" target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">API</a> for development.
      </p>
    </footer>
  );
}
'use client';
import React from 'react';
import { ChatMessage } from '@/app/services/matrix/chatService';

interface SearchListProps {
    results: ChatMessage[];
    hasSearched: boolean;
    onSelect: (eventId: string) => void;
    searchTerm?: string;
  }  

function highlightText(text: string, term: string) {
  if (!term) return text;
  const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.split(regex).map((part, i) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <span key={i} className="bg-yellow-300 rounded px-1 text-black font-semibold">{part}</span>
    ) : (
      part
    )
  );
}

export default function SearchList({ results, hasSearched, onSelect, searchTerm = '' }: SearchListProps) {
    if (hasSearched && results.length === 0) {
        return <div className="p-4 text-center text-gray-500">No results found</div>;
      }   

  return (
    <div className="max-h-64 overflow-y-auto border-t border-b bg-white">
      {results.map((msg) => (
        <div
          key={msg.eventId}
          className="my-2 mx-2 p-3 bg-gray-50 rounded-xl shadow-sm hover:bg-gray-100 cursor-pointer flex flex-col transition"
          onClick={() => onSelect(msg.eventId)}
        >
          <div className="text-sm break-words leading-relaxed">
            {highlightText(msg.body, searchTerm)}
          </div>
          <div className="text-xs text-gray-400 mt-1 text-right">
            {new Date(msg.timestamp).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

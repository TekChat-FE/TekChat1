'use client';
import React from 'react';
import { ChatMessage } from '@/app/services/matrix/chatService';

interface SearchListProps {
    results: ChatMessage[];
    hasSearched: boolean;
    onSelect: (eventId: string) => void;
  }  

  export default function SearchList({ results, hasSearched, onSelect }: SearchListProps) {
    if (hasSearched && results.length === 0) {
        return <div className="p-4 text-center text-gray-500">No results found</div>;
      }   

  return (
    <div className="max-h-64 overflow-y-auto border-t border-b">
      {results.map((msg) => (
        <div
          key={msg.eventId}
          className="p-3 hover:bg-gray-100 cursor-pointer flex justify-between"
          onClick={() => onSelect(msg.eventId)}
        >
          <div className="flex-1">
            <p className="text-sm truncate">{msg.body}</p>
            <p className="text-xs text-gray-500">
              {new Date(msg.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

import React from 'react';
import Cursor from './components/Cursor';
import Application from './components/Application';

export default function App() {
  return (
    <>
      <Cursor />
      <Application onExit={() => window.location.reload()} />
    </>
  );
}

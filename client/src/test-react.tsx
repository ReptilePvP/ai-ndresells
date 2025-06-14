// Pure React test without any external dependencies
function TestApp() {
  return React.createElement('div', { 
    style: { padding: '20px', fontFamily: 'Arial' } 
  }, [
    React.createElement('h1', { key: 'h1' }, 'React Test'),
    React.createElement('p', { key: 'p' }, 'Testing basic React without JSX')
  ]);
}

// Direct DOM manipulation without createRoot
const container = document.getElementById('root');
if (container) {
  const reactRoot = (window as any).ReactDOM?.createRoot?.(container);
  if (reactRoot) {
    reactRoot.render(React.createElement(TestApp));
  } else {
    container.innerHTML = '<h1>React Loading Issue</h1><p>React or ReactDOM not available</p>';
  }
} else {
  console.error('Root element not found');
}
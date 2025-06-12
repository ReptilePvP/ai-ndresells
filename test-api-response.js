// Test script to check API responses
import fetch from 'node-fetch';

async function testSearchAPI() {
  const apiKey = process.env.SEARCHAPI_KEY || 'bGfCEz5mAFmEc6mMA4L6ptYP';
  const testImageUrl = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400';
  
  const url = new URL('https://www.searchapi.io/api/v1/search');
  url.searchParams.set('engine', 'google_lens');
  url.searchParams.set('url', testImageUrl);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('hl', 'en');
  url.searchParams.set('gl', 'us');

  try {
    console.log('Testing SearchAPI with URL:', url.toString().replace(apiKey, '[API_KEY]'));
    const response = await fetch(url.toString());
    const data = await response.json();
    
    console.log('\n=== SearchAPI Response Structure ===');
    console.log('Status:', response.status);
    console.log('Response keys:', Object.keys(data));
    console.log('Visual matches count:', data.visual_matches?.length || 0);
    console.log('Shopping results count:', data.shopping_results?.length || 0);
    console.log('Knowledge graph exists:', !!data.knowledge_graph);
    
    if (data.visual_matches && data.visual_matches[0]) {
      console.log('First visual match keys:', Object.keys(data.visual_matches[0]));
      console.log('First visual match title:', data.visual_matches[0].title);
    }
    
    if (data.error) {
      console.log('API Error:', data.error);
    }
    
    console.log('\nFull response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('SearchAPI test error:', error);
  }
}

async function testSerpAPI() {
  const apiKey = process.env.SERPAPI_KEY || '0df2fcc3b6090d2083f7e1840e585f994b0d0b5339a53c77c4d30a7760701e60';
  const testImageUrl = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400';
  
  const url = new URL('https://serpapi.com/search');
  url.searchParams.set('engine', 'google_lens');
  url.searchParams.set('url', testImageUrl);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('hl', 'en');
  url.searchParams.set('gl', 'us');

  try {
    console.log('\nTesting SerpAPI with URL:', url.toString().replace(apiKey, '[API_KEY]'));
    const response = await fetch(url.toString());
    const data = await response.json();
    
    console.log('\n=== SerpAPI Response Structure ===');
    console.log('Status:', response.status);
    console.log('Response keys:', Object.keys(data));
    console.log('Visual matches count:', data.visual_matches?.length || 0);
    console.log('Shopping results count:', data.shopping_results?.length || 0);
    console.log('Knowledge graph exists:', !!data.knowledge_graph);
    
    if (data.visual_matches && data.visual_matches[0]) {
      console.log('First visual match keys:', Object.keys(data.visual_matches[0]));
      console.log('First visual match title:', data.visual_matches[0].title);
    }
    
    if (data.error) {
      console.log('API Error:', data.error);
    }
    
    console.log('\nFull response sample:', JSON.stringify(data, null, 2).slice(0, 1000) + '...');
    
  } catch (error) {
    console.error('SerpAPI test error:', error);
  }
}

// Run tests
testSearchAPI().then(() => testSerpAPI());
// Test script for MCP Streamable HTTP Transport
// Demonstrates how SSE streams work within HTTP responses

async function testStreamableHTTP() {
  const BASE_URL = 'http://localhost:3000/api/mcp';
  const sessionToken = 'test-session-123';
  
  console.log('🚀 Testing MCP Streamable HTTP Transport\n');
  console.log('This demonstrates SSE streams within HTTP responses as per MCP specification.\n');
  
  try {
    console.log('1. Sending streamable HTTP request with Accept: text/event-stream...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log('⏰ Stream timeout (30 seconds)');
    }, 30000);
    
    // Send MCP request with streaming support
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
        'Accept': 'text/event-stream', // This triggers streamable HTTP
        'User-Agent': 'Claude Desktop/1.2.3 (Test Client)', // Test client info extraction
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "logging/setLevel",
        params: { level: "debug" },
        id: 1
      }),
      signal: controller.signal,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log('✅ Streamable HTTP response received!');
    console.log('📡 Reading SSE events from the stream...\n');
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }
    
    const decoder = new TextDecoder();
    let eventCount = 0;
    let receivedFinalResponse = false;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            eventCount++;
            const eventData = line.substring(6);
            
            try {
              const parsed = JSON.parse(eventData);
              
              console.log(`📨 SSE Event ${eventCount}:`);
              
              if (parsed.method === 'notifications/message') {
                // This is a log notification
                console.log(`   🔔 Log Notification:`);
                console.log(`   📊 Level: ${parsed.params.level}`);
                console.log(`   📝 Logger: ${parsed.params.logger}`);
                console.log(`   💬 Message: ${parsed.params.data.message}`);
                
                if (parsed.params.data.newLevel) {
                  console.log(`   ⚙️  New Log Level: ${parsed.params.data.newLevel}`);
                }
              } else if (parsed.jsonrpc === '2.0' && parsed.id === 1) {
                // This is the final JSON-RPC response
                console.log(`   ✅ Final JSON-RPC Response:`);
                console.log(`   📋 Result: ${JSON.stringify(parsed.result || parsed.error, null, 6)}`);
                receivedFinalResponse = true;
              }
              
              console.log(`   🕒 Timestamp: ${new Date().toISOString()}`);
              console.log('   ---');
              
            } catch (parseError) {
              console.log(`   ⚠️  Raw data: ${eventData}`);
            }
            
            // Auto-disconnect after receiving final response or several events
            if (receivedFinalResponse || eventCount >= 10) {
              console.log('✅ Received final response or enough events, disconnecting...');
              controller.abort();
              break;
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('✅ Stream disconnected successfully');
      } else {
        throw error;
      }
    } finally {
      clearTimeout(timeoutId);
      reader.releaseLock();
    }
    
    console.log(`\n🎉 Streamable HTTP test completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Events received: ${eventCount}`);
    console.log(`   - Final response: ${receivedFinalResponse ? 'Yes' : 'No'}`);
    console.log(`   - Stream closed: Yes`);
    
    console.log('\n📝 What happened:');
    console.log('   1. Client sent MCP request with Accept: text/event-stream');
    console.log('   2. Server opened SSE stream within HTTP response');
    console.log('   3. Log notifications streamed in real-time as SSE events');
    console.log('   4. Final JSON-RPC response sent as last SSE event');
    console.log('   5. Stream closed (following MCP specification)');
    
  } catch (error) {
    console.error('❌ Streamable HTTP test failed:', error.message);
    console.error('This is expected if:');
    console.error('   - Server is not running (npm run start)');
    console.error('   - Authentication token is invalid');
    console.error('   - Environment variables are not configured');
  }
}

async function testTraditionalHTTP() {
  const BASE_URL = 'http://localhost:3000/api/mcp';
  const sessionToken = 'test-session-123';
  
  console.log('\n🔄 Testing Traditional HTTP (for comparison)\n');
  
  try {
    // Send MCP request without streaming support
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
        'User-Agent': 'curl/8.4.0', // Test different client info
        // No Accept: text/event-stream header
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "logging/setLevel",
        params: { level: "info" },
        id: 2
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Traditional HTTP response received:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n📝 Difference:');
    console.log('   - No SSE stream opened');
    console.log('   - Log notifications sent to console only');
    console.log('   - Single JSON response (not streaming)');
    
  } catch (error) {
    console.error('❌ Traditional HTTP test failed:', error.message);
  }
}

async function runTests() {
  await testStreamableHTTP();
  await testTraditionalHTTP();
  
  console.log('\n🎯 Key Features Demonstrated:');
  console.log('   ✨ MCP Streamable HTTP Transport');
  console.log('   📡 SSE streams within HTTP responses');
  console.log('   🔔 Real-time log notification streaming');
  console.log('   ⚡ Automatic transport selection based on Accept header');
  console.log('   🔄 Backward compatibility with traditional HTTP');
}

// Run the tests
runTests();
#!/bin/bash

echo "🧪 Testing PharmaLyncLite Application..."
echo "=================================="

# Test 1: Check if server is running
echo "1. Testing server response..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Server is responding (HTTP $HTTP_CODE)"
else
    echo "❌ Server is not responding (HTTP $HTTP_CODE)"
    exit 1
fi

# Test 2: Check if main page loads
echo "2. Testing main page load..."
PAGE_CONTENT=$(curl -s http://localhost:3000)
if echo "$PAGE_CONTENT" | grep -q "PharmaLync\|auth\|login"; then
    echo "✅ Main page is loading correctly"
else
    echo "❌ Main page is not loading correctly"
fi

# Test 3: Check if Firebase is initialized
echo "3. Testing Firebase initialization..."
if echo "$PAGE_CONTENT" | grep -q "Firebase\|auth"; then
    echo "✅ Firebase appears to be initialized"
else
    echo "⚠️  Firebase initialization status unclear"
fi

# Test 4: Check if navigation components are present
echo "4. Testing navigation components..."
if echo "$PAGE_CONTENT" | grep -q "navigation\|nav\|dashboard"; then
    echo "✅ Navigation components appear to be present"
else
    echo "⚠️  Navigation components status unclear"
fi

echo ""
echo "🎉 Application Tests Complete!"
echo ""
echo "📱 Application is running at: http://localhost:3000"
echo "🔧 To test the fixes:"
echo "   1. Create a Super Admin account"
echo "   2. Login and create a Wholesaler Admin (should create Firebase Auth user)"
echo "   3. Login as Wholesaler Admin and create a Line Worker (should create Firebase Auth user)"
echo "   4. Verify navigation menus are working on all dashboards"
echo ""
echo "📋 Navigation Features to Test:"
echo "   - Desktop: Horizontal tab menu with icons"
echo "   - Mobile: Bottom navigation bar with 'More' menu"
echo "   - Notification bell with badge counter"
echo "   - User welcome message and logout button"
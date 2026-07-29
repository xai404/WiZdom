import { Drawer } from 'expo-router/drawer';

import { DrawerContent } from '@/components/drawer-content';

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        overlayColor: 'rgba(15, 23, 42, 0.4)',
        drawerStyle: { width: '80%', maxWidth: 340 },
        swipeEdgeWidth: 40,
      }}>
      <Drawer.Screen name="dashboard" />
      <Drawer.Screen name="group-chat" />
      <Drawer.Screen name="profile" />
      <Drawer.Screen name="settings" />
      <Drawer.Screen name="documents" />
      <Drawer.Screen name="notifications" />
      <Drawer.Screen name="support" />
    </Drawer>
  );
}

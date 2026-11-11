import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND_COLOR, type TabItem } from '../config';

type Props = {
  tabs: TabItem[];
  activeIndex: number;
  onPress: (tab: TabItem, index: number) => void;
};

type IconName = keyof typeof Ionicons.glyphMap;

/** 하단 네이티브 탭 메뉴 */
export default function TabBar({ tabs, activeIndex, onPress }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {tabs.map((tab, i) => {
        const active = i === activeIndex;
        const color = active ? BRAND_COLOR : '#8E8E93';
        return (
          <Pressable
            key={tab.title}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.title}
            onPress={() => onPress(tab, i)}
            style={styles.item}>
            <Ionicons name={(active ? tab.activeIcon : tab.icon) as IconName} size={24} color={color} />
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {tab.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D1D1D6',
    paddingTop: 6,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  label: { marginTop: 2, fontSize: 11, fontWeight: '500' },
});

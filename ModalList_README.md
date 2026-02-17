# ModalList Component

A versatile and reusable modal list component that slides up from the bottom to display options, cards, or features. The component automatically adjusts its height based on content and provides a smooth user experience with animations.

## Features

- ✅ **Slide-up Animation**: Smooth animated transitions from bottom
- ✅ **Dynamic Height**: Automatically adjusts height based on content
- ✅ **Search Functionality**: Optional search bar with real-time filtering
- ✅ **Multi-Selection**: Support for both single and multi-select modes
- ✅ **Customizable Items**: Support for avatars, icons, and custom rendering
- ✅ **Theming Support**: Fully integrated with app theme system
- ✅ **Safe Area Handling**: Respects device safe areas
- ✅ **Scrollable Content**: Handles large lists with smooth scrolling
- ✅ **Custom Actions**: Header and footer action buttons
- ✅ **Empty States**: Configurable empty state displays

## Installation

The component is already created in `src/components/ModalList.tsx`. Simply import it in your screen or component.

## Basic Usage

```tsx
import ModalList, { ModalListItem } from '../components/ModalList';

// Basic example
const [showModal, setShowModal] = useState(false);

const items: ModalListItem[] = [
  {
    id: '1',
    title: 'Option 1',
    subtitle: 'Description for option 1',
    icon: 'checkmark',
    iconColor: '#10B981',
  },
  {
    id: '2',
    title: 'Option 2',
    subtitle: 'Description for option 2',
    icon: 'star',
    iconColor: '#F59E0B',
  },
];

<ModalList
  visible={showModal}
  onClose={() => setShowModal(false)}
  title="Select Option"
  items={items}
  onSelectItem={(item) => console.log('Selected:', item)}
/>
```

## Props

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `visible` | `boolean` | Controls modal visibility |
| `onClose` | `() => void` | Callback when modal is closed |
| `title` | `string` | Modal title displayed in header |
| `items` | `ModalListItem[]` | Array of items to display |
| `onSelectItem` | `(item: ModalListItem) => void` | Callback when item is selected |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `hasSearch` | `boolean` | `false` | Enable search functionality |
| `searchPlaceholder` | `string` | `'Search...'` | Search input placeholder |
| `onSearchChange` | `(query: string) => void` | `undefined` | Search callback |
| `multiSelect` | `boolean` | `false` | Enable multi-selection mode |
| `selectedItems` | `string[]` | `[]` | Selected item IDs (multi-select) |
| `onSelectionChange` | `(selectedIds: string[]) => void` | `undefined` | Multi-select callback |
| `maxHeight` | `number` | `calculated` | Maximum modal height |
| `renderItem` | `(item, index) => ReactNode` | `undefined` | Custom item renderer |
| `renderEmptyState` | `() => ReactNode` | `undefined` | Custom empty state |
| `headerActions` | `ReactNode` | `undefined` | Custom header buttons |
| `footerActions` | `ReactNode` | `undefined` | Custom footer content |
| `containerStyle` | `ViewStyle` | `undefined` | Container style override |
| `itemStyle` | `ViewStyle` | `undefined` | Item style override |
| `titleStyle` | `TextStyle` | `undefined` | Title style override |

## ModalListItem Interface

```tsx
interface ModalListItem {
  id: string;                    // Unique identifier
  title: string;                 // Primary text
  subtitle?: string;             // Secondary text
  avatar?: string;               // Image URL for avatar
  icon?: keyof typeof Ionicons.glyphMap;  // Icon name
  iconColor?: string;            // Icon color
  backgroundColor?: string;      // Item background color
  isSelected?: boolean;          // Selection state
  disabled?: boolean;            // Disabled state
  [key: string]: any;           // Additional properties
}
```

## Usage Examples

### 1. Simple Selection

```tsx
const [selectedUser, setSelectedUser] = useState(null);

<ModalList
  visible={showUserModal}
  onClose={() => setShowUserModal(false)}
  title="Select User"
  items={users}
  onSelectItem={(user) => setSelectedUser(user)}
/>
```

### 2. With Search

```tsx
const [filteredItems, setFilteredItems] = useState(items);

const handleSearch = (query) => {
  const filtered = items.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase())
  );
  setFilteredItems(filtered);
};

<ModalList
  visible={showModal}
  onClose={() => setShowModal(false)}
  title="Search Items"
  items={filteredItems}
  onSelectItem={handleSelect}
  hasSearch={true}
  searchPlaceholder="Search by name..."
  onSearchChange={handleSearch}
/>
```

### 3. Multi-Selection

```tsx
const [selectedIds, setSelectedIds] = useState([]);

<ModalList
  visible={showModal}
  onClose={() => setShowModal(false)}
  title="Select Team Members"
  items={teamMembers}
  onSelectItem={() => {}} // Not used in multi-select
  multiSelect={true}
  selectedItems={selectedIds}
  onSelectionChange={setSelectedIds}
  footerActions={
    <AppButton
      title={`Confirm (${selectedIds.length} selected)`}
      onPress={() => handleConfirm()}
      disabled={selectedIds.length === 0}
    />
  }
/>
```

### 4. Custom Item Rendering

```tsx
const renderCustomItem = (item, index) => (
  <TouchableOpacity style={styles.customItem}>
    <Text style={styles.customTitle}>{item.title}</Text>
    <Text style={styles.customSubtitle}>{item.subtitle}</Text>
    {/* Custom content */}
  </TouchableOpacity>
);

<ModalList
  visible={showModal}
  onClose={() => setShowModal(false)}
  title="Custom Items"
  items={items}
  onSelectItem={handleSelect}
  renderItem={renderCustomItem}
/>
```

### 5. With Header Actions

```tsx
<ModalList
  visible={showModal}
  onClose={() => setShowModal(false)}
  title="Users"
  items={users}
  onSelectItem={handleSelect}
  headerActions={
    <TouchableOpacity onPress={handleAddUser}>
      <Ionicons name="add" size={24} color="#007AFF" />
    </TouchableOpacity>
  }
/>
```

## Advanced Example: Staff Assignment Modal

See `src/components/AssignStaffModal.tsx` for a complete implementation showing:
- Multi-selection with role assignment
- Custom item rendering
- Search functionality
- Footer actions
- Complex state management

## Modal Height Behavior

The modal automatically calculates its height based on:
1. **Content-based**: Header + search + items + footer + padding
2. **Screen constraint**: Maximum height is screen height minus safe area
3. **Scrollable**: When content exceeds max height, the list becomes scrollable
4. **Custom override**: Use `maxHeight` prop to set a specific limit

## Theming

The component fully integrates with the app's theme system:
- Uses `useTheme()` hook for colors
- Supports light/dark mode
- Customizable through theme colors
- Style overrides available via props

## Best Practices

1. **Performance**: Use `useMemo` for large item lists
2. **Search**: Implement debounced search for better performance
3. **Empty States**: Always provide meaningful empty states
4. **Accessibility**: Ensure proper accessibility labels
5. **Loading States**: Show loading indicators during data fetching

## Migration from Existing Modals

To replace existing custom modals:

1. Convert your data to `ModalListItem[]` format
2. Replace modal JSX with `<ModalList />` component
3. Move custom logic to `renderItem` prop if needed
4. Update state management to use component props

## Example Data Structures

### Users
```tsx
const users: ModalListItem[] = [
  {
    id: '1',
    title: 'John Doe',
    subtitle: 'Admin • Marketing Team',
    avatar: 'https://example.com/avatar1.jpg',
  },
];
```

### Options
```tsx
const options: ModalListItem[] = [
  {
    id: '1',
    title: 'Camera',
    subtitle: 'Take a photo',
    icon: 'camera',
    iconColor: '#8B5CF6',
  },
];
```

### Companies
```tsx
const companies: ModalListItem[] = [
  {
    id: '1',
    title: 'Tech Solutions Inc.',
    subtitle: '123 Business Ave, Tech City',
    icon: 'business',
    iconColor: '#3B82F6',
  },
];
```

## Demo

Run the example screen to see all features in action:
```tsx
import ModalListExampleScreen from '../screens/ModalListExampleScreen';
```

The demo includes examples of:
- Basic usage
- Search functionality
- Multi-selection
- Custom rendering
- Different data types
- Various configurations 
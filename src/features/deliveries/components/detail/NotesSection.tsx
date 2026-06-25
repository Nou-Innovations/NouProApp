/**
 * NotesSection Component
 * 
 * Displays order notes in collapsible cards grouped by date.
 * Includes note input if canAddNotes is true.
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';

interface Note {
  id: string;
  businessName: string;
  businessAvatar: string;
  message: string;
  timestamp: Date;
}

interface NotesSectionProps {
  /** Array of notes to display */
  notes: Note[];
  /** Whether the user can add new notes */
  canAddNotes?: boolean;
  /** Callback when a note is sent */
  onAddNote?: (noteText: string) => void;
  /** Placeholder text for the note input */
  placeholder?: string;
  /** Mode for staff: 'general' or 'reportIssue' */
  mode?: 'general' | 'reportIssue';
}

export function NotesSection({
  notes,
  canAddNotes = true,
  onAddNote,
  placeholder = 'Leave a note',
  mode = 'general',
}: NotesSectionProps) {
  const [noteText, setNoteText] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Toggle note expansion
  const toggleNoteExpansion = (noteId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  // Group notes by date
  const groupedNotes = useMemo(() => {
    const groups: { [key: string]: Note[] } = {};
    notes.forEach(note => {
      // Format as DD.MM.YY
      const day = note.timestamp.getDate().toString().padStart(2, '0');
      const month = (note.timestamp.getMonth() + 1).toString().padStart(2, '0');
      const year = note.timestamp.getFullYear().toString().slice(-2);
      const dateKey = `${day}.${month}.${year}`;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(note);
    });
    return Object.entries(groups).sort((a, b) =>
      new Date(b[1][0].timestamp).getTime() - new Date(a[1][0].timestamp).getTime()
    );
  }, [notes]);

  // Format time for notes (lowercase am/pm)
  const formatNoteTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes}${period}`;
  };

  // Handle send note
  const handleSendNote = () => {
    if (!noteText.trim()) return;
    if (onAddNote) {
      onAddNote(noteText.trim());
    } else {
      AppAlert.alert('Note Sent', 'Your note has been sent.');
    }
    setNoteText('');
  };

  const inputPlaceholder = mode === 'reportIssue' ? 'Report an issue...' : placeholder;
  const buttonText = mode === 'reportIssue' ? 'Report issue' : 'Send note';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notes</Text>

      {/* Notes List */}
      {groupedNotes.map(([dateKey, dateNotes]) => (
        <View key={dateKey} style={styles.notesDateGroup}>
          <Text style={styles.notesDateHeader}>{dateKey}</Text>
          {dateNotes.map((note, noteIndex) => (
            <TouchableOpacity
              key={note.id}
              style={[
                styles.noteCard,
                noteIndex === dateNotes.length - 1 && { borderBottomWidth: 0 }
              ]}
              onPress={() => toggleNoteExpansion(note.id)}
              activeOpacity={0.7}
            >
              <View style={styles.noteCardHeader}>
                <View style={styles.noteCardHeaderLeft}>
                  <View style={styles.noteAvatar}>
                    <Text style={styles.noteAvatarText}>{note.businessAvatar}</Text>
                  </View>
                  <Text style={styles.noteBusinessName}>{note.businessName}</Text>
                </View>
                <View style={styles.noteCardHeaderRight}>
                  <Text style={styles.noteTime}>{formatNoteTime(note.timestamp)}</Text>
                  <Icon
                    name={expandedNotes.has(note.id) ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                </View>
              </View>
              {expandedNotes.has(note.id) && (
                <Text style={styles.noteContent}>{note.message}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* Note Input */}
      {canAddNotes && (
        <View style={styles.noteInputContainer}>
          <TextInput
            style={styles.noteInput}
            placeholder={inputPlaceholder}
            placeholderTextColor={theme.colors.textSecondary}
            value={noteText}
            onChangeText={setNoteText}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendNoteButton,
              !noteText.trim() && styles.sendNoteButtonDisabled
            ]}
            onPress={handleSendNote}
            disabled={!noteText.trim()}
          >
            <Text style={[
              styles.sendNoteButtonText,
              !noteText.trim() && styles.sendNoteButtonTextDisabled
            ]}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: 'InterCustom-SemiBold',
    marginBottom: 8,
  },
  notesDateGroup: {
    marginBottom: 0,
  },
  notesDateHeader: {
    fontSize: 14,
    fontFamily: 'InterCustom-Medium',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  noteCard: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: theme.colors.borderColor,
    borderRadius: 0,
    paddingVertical: 12,
    paddingHorizontal: 0,
    marginBottom: 0,
    backgroundColor: '#FFFFFF',
  },
  noteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  noteAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  noteAvatarText: {
    fontSize: 14,
    fontFamily: 'InterCustom-Bold',
    color: '#FFFFFF',
  },
  noteBusinessName: {
    fontSize: 16,
    fontFamily: 'InterCustom-SemiBold',
    color: theme.colors.text,
    flex: 1,
  },
  noteCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteTime: {
    fontSize: 14,
    fontFamily: 'InterCustom-Medium',
    color: theme.colors.textSecondary,
  },
  noteContent: {
    fontSize: 14,
    fontFamily: 'InterCustom-Medium',
    lineHeight: 20,
    color: theme.colors.text,
    marginTop: 12,
  },
  noteInputContainer: {
    marginTop: 16,
    gap: 12,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    fontFamily: 'InterCustom-Medium',
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    textAlignVertical: 'top',
  },
  sendNoteButton: {
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  sendNoteButtonDisabled: {
    backgroundColor: theme.colors.buttonBackgroundDisabled,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  sendNoteButtonText: {
    fontSize: 14,
    fontFamily: 'InterCustom-SemiBold',
    color: '#FFFFFF',
  },
  sendNoteButtonTextDisabled: {
    color: theme.colors.textSecondary,
  },
});

export default NotesSection;

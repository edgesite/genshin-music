import './MidiSetup.css'
import { APP_NAME } from "appConfig"
import { MIDISettings } from "lib/BaseSettings"
import BaseNote from "components/BaseNote"
import { LAYOUT_IMAGES, MIDI_STATUS } from "appConfig"
import { Component } from 'react'
import { INSTRUMENTS } from "appConfig"
import Instrument from "lib/Instrument"
import Shortcut from "./Shortcut"
import LoggerStore from "stores/LoggerStore"
import type { MIDINote } from "lib/Tools"
import { InstrumentName, InstrumentNotesLayout } from "types/GeneralTypes"
import { MIDIEvent, MIDIProvider } from "lib/Providers/MIDIProvider"
import { AudioProvider } from "lib/Providers/AudioProvider"
import { DefaultPage } from "components/DefaultPage"
import { NoteImage } from "types/Keyboard"

interface MidiSetupState {
    instrument: Instrument
    settings: typeof MIDISettings
    selectedNote: MIDINote | null
    selectedShortcut: string | null
    sources: WebMidi.MIDIInput[]
    selectedSource: WebMidi.MIDIInput | null
}

export default class MidiSetup extends Component<any, MidiSetupState> {
    state: MidiSetupState
    mounted: boolean
    constructor(props: any) {
        super(props)
        this.state = {
            instrument: new Instrument(),
            settings: MIDIProvider.settings,
            selectedNote: null,
            selectedShortcut: null,
            sources: [],
            selectedSource: null
        }
        this.mounted = true
    }
    componentDidMount() {
        this.init()
    }
    componentWillUnmount() {
        this.mounted = false
        MIDIProvider.clear()
        AudioProvider.clear()
    }
    init = async () => {
        await this.loadInstrument(INSTRUMENTS[0])
		await MIDIProvider.enable()
        MIDIProvider.addInputsListener(this.midiStateChange)
        MIDIProvider.addListener(this.handleMidi)

        this.setState({ 
            sources: MIDIProvider.inputs,
            selectedSource: MIDIProvider.currentMIDISource
         })
    }
    midiStateChange = (inputs: WebMidi.MIDIInput[]) => {
        if (!this.mounted) return
        const { sources } = this.state
        if (sources.length > inputs.length)
            LoggerStore.warn('Device disconnected')
        else if (inputs.length > 0)
            LoggerStore.warn('Device connected')
        this.setState({ sources: inputs })
    }
    selectMidi = (selectedSource?: WebMidi.MIDIInput) => {
        if (!this.mounted || !selectedSource) return
        MIDIProvider.selectSource(selectedSource)
        this.setState({ selectedSource })
        MIDIProvider.saveSettings()
    }

    deselectNotes = () => {
        const { settings } = this.state
        settings.notes.forEach(note => {
            note.status = note.midi < 0 ? 'wrong' : 'right'
        })
        this.setState({ settings })
    }
    loadInstrument = async (name: InstrumentName) => {
        AudioProvider.disconnect(this.state.instrument.endNode)
        this.state.instrument.delete()
        const instrument = new Instrument(name)
        await instrument.load()
        if (!this.mounted) return
        AudioProvider.connect(instrument.endNode)
        this.setState({ instrument })
    }
    checkIfUsed = (midi: number, type: 'all' | 'shortcuts' | 'notes') => {
        const { shortcuts, notes } = this.state.settings
        if (shortcuts.find(e => e.midi === midi) && ['all', 'shortcuts'].includes(type)) return true
        if (notes.find(e => e.midi === midi) && ['all', 'notes'].includes(type)) return true
        return false
    }
    handleMidi = ([eventType, note, velocity]: MIDIEvent) => {
        const { selectedNote, settings, selectedShortcut } = this.state
        const isDown = eventType >= MIDI_STATUS.down && eventType < MIDI_STATUS.down + 16;
        if (isDown && velocity !== 0) {
            if (selectedNote) {
                if (this.checkIfUsed(note, 'shortcuts')) return LoggerStore.warn('Key already used')
                selectedNote.midi = note
                this.deselectNotes()
                this.setState({ selectedNote: null })
                MIDIProvider.saveSettings()
            }
            if (selectedShortcut) {
                const shortcut = settings.shortcuts.find(e => e.type === selectedShortcut)
                if (this.checkIfUsed(note, 'all')) return LoggerStore.warn('Key already used')
                if (shortcut) {
                    shortcut.midi = note
                    shortcut.status = note < 0 ? 'wrong' : 'right'
                    this.setState({ settings: settings })
                    MIDIProvider.saveSettings()
                }
            }
            const shortcut = settings.shortcuts.find(e => e.midi === note)
            if (shortcut) {
                shortcut.status = 'clicked'
                setTimeout(() => {
                    shortcut.status = note < 0 ? 'wrong' : 'right'
                    this.setState({ settings: settings })
                }, 150)
                this.setState({ settings: settings })

            }
            const keyboardNotes = settings.notes.filter(e => e.midi === note)
            keyboardNotes.forEach(keyboardNote => {
                this.handleClick(keyboardNote, true)
            })
        }
    }
    handleClick = (note: MIDINote, animate = false) => {
        const { settings } = this.state
        if (!animate) this.deselectNotes()
        note.status = 'clicked'
        if (animate) {
            setTimeout(() => {
                note.status = note.midi < 0 ? 'wrong' : 'right'
                this.setState({ settings })
            }, 200)
            this.setState({ settings, selectedShortcut: null })
        } else {
            this.setState({ settings, selectedNote: note, selectedShortcut: null })
        }
        this.playSound(note)
    }
    handleShortcutClick = (shortcut: string) => {
        this.deselectNotes()
        if (this.state.selectedShortcut === shortcut) {
            return this.setState({ selectedShortcut: null, selectedNote: null })
        }
        this.setState({ selectedShortcut: shortcut, selectedNote: null })
    }
    playSound = (note: MIDINote) => {
        if (note === undefined) return
        this.state.instrument.play(note.index, 'C')
    }

    render() {
        const { settings, sources, selectedShortcut, selectedSource } = this.state
        return <DefaultPage>
            <div className="column midi-setup-column">
                <div>
                    Select MIDI device:
                    <select
                            className="midi-select"
                            value={selectedSource ? selectedSource.id : 'None'}
                            onChange={(e) => {
                                this.selectMidi(sources.find(s => s.id === e.target.value))
                            }}
                        >
                            <option disabled value={'None'}> None</option>
                            {sources.map((e, i) => <option value={e.id} key={e.id}>
                                {e.name} - {e.id}
                            </option>)
                            }
                        </select>
                </div>
                <div style={{ margin: '0.5rem 0' }}>
                    Click on the note to map, then press your MIDI keyboard
                </div>
            </div>
            <div className="midi-setup-content">
                <div
                    className={APP_NAME === 'Genshin' ? "keyboard" : "keyboard keyboard-5"}
                    style={{ marginTop: 'auto', width: 'fit-content' }}
                >
                    {settings.notes.map((note, i) => {
                        const noteImage = LAYOUT_IMAGES[settings.notes.length as InstrumentNotesLayout][note.index]
                        return <BaseNote
                            key={i}
                            handleClick={this.handleClick}
                            data={note}
                            noteImage={noteImage as NoteImage}
                            noteText={note.midi < 0 ? 'NA' : String(note.midi)}
                        />
                    })}
                </div>
                <div className="midi-shortcuts-wrapper">
                    <div style={{ fontSize: '1.5rem' }}>
                        Shortcuts
                    </div>
                    <div className="midi-shortcuts">
                        {settings.shortcuts.map(shortcut =>
                            <Shortcut
                                key={shortcut.type}
                                type={shortcut.type}
                                status={shortcut.status}
                                midi={shortcut.midi}
                                selected={selectedShortcut === shortcut.type}
                                onClick={this.handleShortcutClick}
                            />
                        )}
                    </div>
                </div>
            </div>
        </DefaultPage>
    }
}
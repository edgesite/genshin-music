import { memo, useCallback, useEffect, useState } from 'react'
import { FaMusic, FaSave, FaCog, FaHome, FaTrash, FaDownload, FaTimes } from 'react-icons/fa';
import { FileDownloader, parseSong } from "lib/Tools"
import { APP_NAME } from 'appConfig'
import MenuItem from 'components/MenuItem'
import MenuPanel from 'components/MenuPanel'
import SettingsRow from 'components/SettingsRow'
import DonateButton from 'components/DonateButton'
import Memoized from 'components/Memoized';
import { IS_MIDI_AVAILABLE } from 'appConfig';
import Analytics from 'lib/Analytics';
import LoggerStore from 'stores/LoggerStore';
import { AppButton } from 'components/AppButton';
import { SongMenu } from 'components/SongMenu';
import { ComposerSettingsDataType } from 'lib/BaseSettings';
import { SettingUpdate, SettingUpdateKey, SettingVolumeUpdate } from 'types/SettingsPropriety';
import { Pages } from 'types/GeneralTypes';
import { SerializedSongType } from 'types/SongTypes';
import { useTheme } from 'lib/hooks/useTheme';
import { ThemeStoreClass } from 'stores/ThemeStore';
import { hasTooltip, Tooltip } from 'components/Tooltip';
import { HelpTooltip } from 'components/HelpTooltip';

interface MenuProps {
    data: {
        songs: SerializedSongType[]
        settings: ComposerSettingsDataType,
        hasChanges: boolean,
        isMenuOpen: boolean,
        isRecordingAudio: boolean
    }
    functions: {
        loadSong: (song: SerializedSongType) => void
        removeSong: (name: string) => void
        createNewSong: () => void
        changePage: (page: Pages | 'Home') => void
        updateThisSong: () => void
        handleSettingChange: (data: SettingUpdate) => void
        toggleMenuVisible: () => void
        changeVolume: (data: SettingVolumeUpdate) => void
        changeMidiVisibility: (visible: boolean) => void
        startRecordingAudio: (override?: boolean) => void
    }
}
export type MenuTabs = 'Songs' | 'Help' | 'Settings' | 'Home'
function Menu({ data, functions }: MenuProps) {
    const [open, setOpen] = useState(false)
    const [selectedMenu, setSelectedMenu] = useState<MenuTabs>('Settings')
    const { loadSong, removeSong, changePage, handleSettingChange, changeVolume, createNewSong, changeMidiVisibility, toggleMenuVisible, updateThisSong } = functions
    const [theme] = useTheme()
    const handleKeyboard = useCallback((event: KeyboardEvent) => {
        const key = event.code
        if (document.activeElement?.tagName === "INPUT") return
        //@ts-ignore
        document.activeElement?.blur()
        switch (key) {
            case "Escape": {
                if (open) toggleMenuVisible()
                setOpen(false)
                break
            }
            default: break;
        }
    }, [open, toggleMenuVisible])

    useEffect(() => {
        window.addEventListener("keydown", handleKeyboard)
        return () => window.removeEventListener('keydown', handleKeyboard)
    }, [handleKeyboard])

    const toggleMenu = useCallback((override?: boolean) => {
        if (typeof override !== "boolean") override = undefined
        const newState = override !== undefined ? override : !open
        setOpen(newState)
        if (newState === false) toggleMenuVisible()
    }, [open, toggleMenuVisible])

    const selectSideMenu = useCallback((selection?: MenuTabs) => {
        if (selection === selectedMenu && open) {
            return setOpen(false)
        }
        setOpen(true)
        if (selection) {
            setSelectedMenu(selection)
            Analytics.UIEvent('menu', { tab: selection })
        }
    }, [open, selectedMenu])

    const downloadSong = useCallback((song: SerializedSongType) => {
        try {
            song.data.appName = APP_NAME
            const songName = song.name
            const parsed = parseSong(song)
            const converted = [APP_NAME === 'Sky' ? parsed.toOldFormat() : parsed.serialize()]
            const json = JSON.stringify(converted)
            FileDownloader.download(json, `${songName}.${APP_NAME.toLowerCase()}sheet.json`)
            LoggerStore.success("Song downloaded")
            Analytics.userSongs('download', { name: parsed.name, page: 'composer' })
        } catch (e) {
            console.log(e)
            LoggerStore.error('Error downloading song')
        }
    }, [])

    const sideClass = open ? "side-menu menu-open" : "side-menu"
    const songFunctions = {
        loadSong,
        removeSong,
        toggleMenu,
        downloadSong
    }
    const hasUnsaved = data.hasChanges ? "margin-top-auto not-saved" : "margin-top-auto"
    const menuClass = data.isMenuOpen ? "menu menu-visible" : "menu"
    return <div className="menu-wrapper">
        <div className={menuClass}>
            <MenuItem<MenuTabs> action={() => toggleMenu(false)} className='close-menu'>
                <FaTimes className="icon" />
            </MenuItem>
            <MenuItem<MenuTabs> action={updateThisSong} className={hasUnsaved}>
                <Memoized>
                    <FaSave className="icon" />
                </Memoized>
            </MenuItem>
            <MenuItem<MenuTabs> data="Songs" action={selectSideMenu}>
                <Memoized>
                    <FaMusic className="icon" />
                </Memoized>
            </MenuItem>
            <MenuItem<MenuTabs> data="Settings" action={selectSideMenu}>
                <Memoized>
                    <FaCog className="icon" />
                </Memoized>
            </MenuItem>
            <MenuItem<MenuTabs> action={() => changePage('Home')}>
                <Memoized>
                    <FaHome className="icon" />
                </Memoized>
            </MenuItem>
        </div>
        <div className={sideClass}>

            <MenuPanel title="Songs" current={selectedMenu}>
                <div className="songs-buttons-wrapper">
                    <HelpTooltip>
                        <ul>
                            <li>Click the song name to load it</li>
                            <li>You can use different instruments for each layer</li>
                            <li>Tempo changers help you make faster parts of a song without having very high bpm</li>
                            <li>You can quickly create a song by importing a MIDI file and editing it</li>
                            <li>
                                You can add breakpoints to the timeline (the bar below the composer) to quickly jump
                                between parts of a song
                            </li>
                        </ul>
                    </HelpTooltip>
                    <AppButton 
                        onClick={() => { changeMidiVisibility(true); toggleMenu() }}
                        style={{marginLeft: 'auto'}}
                    >
                        Create from MIDI
                    </AppButton>
                    <AppButton onClick={createNewSong}>
                        Create new song
                    </AppButton>
                </div>
                <SongMenu
                    songs={data.songs}
                    SongComponent={SongRow}
                    baseType='composed'
                    componentProps={{
                        theme,
                        functions: songFunctions
                    }}
                />
                <div className="songs-buttons-wrapper" style={{ marginTop: 'auto' }}>
                    <AppButton
                        style={{ marginTop: '0.5rem' }}
                        className={`record-btn`}
                        onClick={() => functions.startRecordingAudio(!data.isRecordingAudio)}
                        toggled={data.isRecordingAudio}
                    >
                        {data.isRecordingAudio ? "Stop recording audio" : "Start recording audio"}

                    </AppButton>
                </div>

            </MenuPanel>
            <MenuPanel title="Settings" current={selectedMenu}>
                {Object.entries(data.settings).map(([key, data]) =>
                    <SettingsRow
                        key={key}
                        objKey={key as SettingUpdateKey}
                        data={data}
                        changeVolume={changeVolume}
                        update={handleSettingChange}
                    />
                )}
                <div className='settings-row-wrap'>
                    {IS_MIDI_AVAILABLE &&
                        <AppButton
                            onClick={() => changePage('MidiSetup')}
                            style={{ width: 'fit-content' }}
                        >
                            Connect MIDI keyboard

                        </AppButton>
                    }
                    <AppButton
                        onClick={() => changePage('Theme')}
                        style={{ width: 'fit-content' }}
                    >
                        Change app theme
                    </AppButton>
                </div>
                <DonateButton />
            </MenuPanel>
        </div>
    </div>
}


interface SongRowProps {
    data: SerializedSongType
    theme: ThemeStoreClass
    functions: {
        removeSong: (name: string) => void
        toggleMenu: (override: boolean) => void
        loadSong: (song: SerializedSongType) => void
        downloadSong: (song: SerializedSongType) => void
    }
}

function SongRow({ data, functions, theme }: SongRowProps) {
    const { removeSong, toggleMenu, loadSong, downloadSong } = functions
    const buttonStyle = { backgroundColor: theme.layer('primary', 0.15).hex() }
    return <div className="song-row">
        <div className={`song-name ${hasTooltip(true)}`} onClick={() => {
            loadSong(data)
            toggleMenu(false)
        }}>
            {data.name}
            <Tooltip>
                Open in composer
            </Tooltip>
        </div>
        <div className="song-buttons-wrapper">
            <button className="song-button" onClick={() => downloadSong(data)} style={buttonStyle}>
                <Memoized>
                    <FaDownload />
                </Memoized>
            </button>
            <button className="song-button" onClick={() => removeSong(data.name)} style={buttonStyle}>
                <Memoized>
                    <FaTrash color="#ed4557" />
                </Memoized>
            </button>
        </div>
    </div>
}

export default memo(Menu, (p, n) => {
    return p.data.songs === n.data.songs && p.data.settings === n.data.settings &&
        p.data.hasChanges === n.data.hasChanges && p.data.isMenuOpen === n.data.isMenuOpen && p.data.isRecordingAudio === n.data.isRecordingAudio
})
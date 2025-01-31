import { APP_NAME } from "appConfig"
import { ComposedSong } from "lib/ComposedSong"
import { Song } from "lib/Song"
import { Column, ColumnNote, RecordedNote } from "lib/SongClasses"
import { getNoteText } from "lib/Tools"

const THRESHOLDS = {
    joined: 50,
    pause: 400,
}
type NoteDifference = {
    delay: number
    index: number
    layer: number
    time: number
}
function getChunkNoteText(i: number) {
    const text = getNoteText(APP_NAME === 'Genshin' ? 'Keyboard layout' : 'ABC', i, 'C', APP_NAME === "Genshin" ? 21 : 15)
    return APP_NAME === 'Genshin' ? text.toLowerCase() : text.toUpperCase()
}
export class VisualSong {
    private baseChunks: Chunk[] = []
    type: 'song' | 'composed' = 'song'
    chunks: Chunk[] = []
    text: string = ''

    get currentChunk() {
        return this.baseChunks[this.baseChunks.length - 1]
    }

    static noteDifferences(notes: RecordedNote[]) {
        const parsed: NoteDifference[] = []
        for (let i = 0; i < notes.length; i++) {
            const delay = notes[i + 1] ? notes[i + 1][1] - notes[i][1] : 0
            parsed.push({
                delay,
                index: notes[i][0],
                time: notes[i][1],
                layer: notes[i][2]
            })
        }
        return parsed
    }
    static from(song: Song | ComposedSong) {
        const vs = new VisualSong()
        if(song instanceof Song){
            vs.createChunk(0)
        }else if(song instanceof ComposedSong){
            const { columns } = song
            const padding = [...columns].reverse().findIndex(column => column.notes.length)
            const trimmed = columns.slice(0, columns.length - padding).map(column => column.clone())
            
            for(let i = 0; i < trimmed.length; i++){
                const column = trimmed[i]
                if(column.tempoChanger === vs.currentChunk?.tempoChanger){
                    vs.currentChunk.addColumn(ChunkColumn.from(column))
                }else{
                    vs.currentChunk.addColumn(ChunkColumn.from(column))
                    vs.createChunk(column.tempoChanger as ChunkTempoChanger)
                }
            }
        }
        vs.finalize()
        return vs
    }
    finalize() {
        console.log(this.baseChunks)
        this.text = this.baseChunks.map(chunk => chunk.toString()).join(' ')
    }
    createChunk(changer?: ChunkTempoChanger){
        const chunk = new Chunk(changer || 1)
        this.baseChunks.push(chunk)
        return chunk
    }
    addChunk(chunk: Chunk) {
        this.baseChunks.push(chunk)
    }

}

class ChunkNote{
    index: number
    layer: number
    constructor(index?: number, layer?: number){
        this.index = index || 0
        this.layer = layer || 0
    }
    static from(columnNote: ColumnNote){
        const layer = 1 + columnNote.layer.split('').findIndex(l => l === '1')
        const chunkNote = new ChunkNote(columnNote.index, layer)
        return chunkNote
    }
}

type ChunkTempoChanger = 0 | 1 | 2 | 3
class ChunkColumn{
    notes: ChunkNote[] = []

    addNote(note: ChunkNote){
        this.notes.push(note)
    }
    static from(column: Column){
        const chunkColumn = new ChunkColumn()
        column.notes.forEach(note => {
            chunkColumn.addNote(ChunkNote.from(note))
        })   
        return chunkColumn
    }
}

const tempoChangerMap = {
    0: '',
    1: '*',
    2: '~',
    3: '^',
}
export class Chunk{
    columns: ChunkColumn[] = []
    tempoChanger: ChunkTempoChanger
    constructor(changer?:ChunkTempoChanger){
        this.tempoChanger = changer || 0
    }
    get tempoString(){
        return tempoChangerMap[this.tempoChanger]
    }
    addColumn(column: ChunkColumn){
        this.columns.push(column)
    }
    toString(){
        const notes = this.columns.map(column => column.notes).flat()
        const text = notes.map(note => getChunkNoteText(note.index)).join('')
        return notes.length ? text : `[${this.tempoString}${text}]`
    }
}
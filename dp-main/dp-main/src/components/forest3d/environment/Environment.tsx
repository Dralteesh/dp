import { Bushes } from './Bushes'
import { Hill } from './Hill'
import { Lighting } from './Lighting'
import { MossTufts } from './MossTufts'
import { Rocks } from './Rocks'

/** Everything around the trees. Knows nothing about them. */
export function Environment({ night = false }: { night?: boolean }) {
  return (
    <>
      <Lighting night={night} />
      <Hill />
      <MossTufts />
      <Rocks />
      <Bushes />
    </>
  )
}



const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')
const Gossipsub = require('libp2p-gossipsub')

const createNode = async () => {
  const peerInfo = await PeerInfo.create()
  peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')

  const node = await Libp2p.create({
    peerInfo,
    modules: {
      transport: [TCP],
      streamMuxer: [Mplex],
      connEncryption: [SECIO],
      pubsub: Gossipsub
    },
    config: {
      pubsub: {                     // The pubsub options (and defaults) can be found in the pubsub router documentation
        enabled: true,
        emitSelf: true,             // whether the node should emit to self on publish
        signMessages: true,         // if messages should be signed
        strictSigning: true         // if message signing should be required
      }
    }
  })

  await node.start()
  return node
}

;(async () => {
  const topic = 'news'
  const [node1, node2, node3, node4, node5] = await Promise.all([
    createNode(),
    createNode(),
    createNode(),
    createNode(),
    createNode(),
  ])
  await node1.dial(node2.peerInfo)
  await node5.dial(node4.peerInfo)
  await node3.dial(node2.peerInfo)
  await node4.dial(node1.peerInfo)

  await node1.pubsub.subscribe(topic, (msg) => {
    console.log(`node1 received: ${msg.data.toString()}`)
  })

  await node2.pubsub.subscribe(topic, (msg) => {
    console.log(`node2 received: ${msg.data.toString()}`)
  })

  await node3.pubsub.subscribe(topic, (msg) => {
    console.log(`node3 received: ${msg.data.toString()}`)
  })

  await node4.pubsub.subscribe(topic, (msg) => {
    console.log(`node4 received: ${msg.data.toString()}`)
  })

  await node5.pubsub.subscribe(topic, (msg) => {
    console.log(`node5 received: ${msg.data.toString()}`)
  })

  // node2 publishes "news" every second
  let b = 1
  setInterval(() => {
    node2.pubsub.publish(topic, Buffer.from(String(b++)))
  }, 400)
})();
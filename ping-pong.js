const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')
const pipe = require('it-pipe')

// TCP 통신을 하는 libp2p 노드 생성 함수
const createNode = async () => {
  const peerInfo = await PeerInfo.create()
  peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0') // 사용가능한 모든 ip4로 tcp 리스너 주소 생성

  const node = await Libp2p.create({
    peerInfo,
    modules: {
      transport: [TCP], // transport를 TCP로 지정
      streamMuxer: [Mplex], // 멀티스트림을 묶기 위한 streamMuxer 지정
      connEncryption: [SECIO], // 연결간 암호화모듈로 SECIO설정
    }
  })
  await node.start()
  return node
}

;(async () => {  
  // 노드1과 노드2 생성
  const [node1, node2] = await Promise.all([
    createNode(),
    createNode(),
  ])
  // 노드2에 /PingPong 이라는 임의의 프로토콜로 전달되는 스트림 핸들러 설정
  node2.handle("/PingPong",({ stream })=>{
    // ReactiveJs같은 스트림 모듈인 it-pipe를 사용
    pipe(
      stream,
      // stream으로 부터 받은 메시지를 asyncIterator처리를 통해 출력하고 Pong을 다시 stream에게 전달함
      source => (async function * () {
        for await (const msg of source) {
          console.log(msg.toString())
          yield "Pong"
        }
      })(),
      stream
    )
  })

  // 노드 1로부터 노드 2에 /PingPong이라는 프로토콜로 연결을 시도함
  const { stream }= await node1.dialProtocol(node2.peerInfo, "/PingPong")

  // Ping을 보내고 되돌아온 Pong을 출력함
  pipe(
    ()=>(async function * () {
      while(true){
        await new Promise(resolve => setTimeout(resolve, 1000))
        yield "Ping"
      }
    })(),
    stream,
    async function (source) {
      for await (const msg of source) {
        console.log(msg.toString())
      }  
    }

  )
})();

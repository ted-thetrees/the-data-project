import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
);

function getSession() {
  return driver.session({ database: process.env.NEO4J_DATABASE });
}

const WORDS = [
  "amber","azure","brass","cedar","cobalt","coral","crimson","dawn",
  "dusk","ember","flint","frost","golden","harbor","indigo","ivory",
  "jade","lapis","maple","marble","obsidian","opal","pearl","pine",
  "quartz","raven","sage","scarlet","silver","slate","steel","storm",
  "teal","terra","timber","umber","velvet","violet","willow","zinc",
];

function generatePassphrase() {
  const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)];
  return `${pick()} ${pick()} ${pick()}`;
}

export interface MindMapData {
  nodes: { passphrase: string; name: string; image?: string; completed: boolean }[];
  edges: { parent: string; child: string }[];
}

export async function restoreMindMapSnapshot(snapshot: MindMapData) {
  const session = getSession();
  try {
    // Wipe all MindMapNodes
    await session.run(`MATCH (n:MindMapNode) DETACH DELETE n`);
    // Recreate nodes with all properties
    for (const node of snapshot.nodes) {
      await session.run(
        `CREATE (n:MindMapNode {passphrase: $passphrase, name: $name, image: $image, completed: $completed})`,
        {
          passphrase: node.passphrase,
          name: node.name,
          image: node.image ?? null,
          completed: node.completed ?? false,
        }
      );
    }
    // Recreate edges
    for (const edge of snapshot.edges) {
      await session.run(
        `MATCH (p:MindMapNode {passphrase: $parent}), (c:MindMapNode {passphrase: $child})
         CREATE (p)-[:HAS_CHILD]->(c)`,
        { parent: edge.parent, child: edge.child }
      );
    }
  } finally {
    await session.close();
  }
}

export async function getMindMapData(): Promise<MindMapData> {
  const session = getSession();
  try {
    const nodesResult = await session.run(
      `MATCH (n:MindMapNode) RETURN n.passphrase AS passphrase, n.name AS name, n.image AS image, coalesce(n.completed, false) AS completed`
    );
    const edgesResult = await session.run(
      `MATCH (p:MindMapNode)-[:HAS_CHILD]->(c:MindMapNode)
       RETURN p.passphrase AS parent, c.passphrase AS child`
    );
    return {
      nodes: nodesResult.records.map((r) => ({
        passphrase: r.get("passphrase"),
        name: r.get("name"),
        image: r.get("image") ?? undefined,
        completed: r.get("completed") ?? false,
      })),
      edges: edgesResult.records.map((r) => ({
        parent: r.get("parent"),
        child: r.get("child"),
      })),
    };
  } finally {
    await session.close();
  }
}

export async function createMindMapNode(name: string) {
  const session = getSession();
  try {
    const passphrase = generatePassphrase();
    const result = await session.run(
      `CREATE (n:MindMapNode {passphrase: $passphrase, name: $name})
       RETURN n.passphrase AS passphrase, n.name AS name`,
      { passphrase, name }
    );
    const rec = result.records[0];
    return { passphrase: rec.get("passphrase"), name: rec.get("name") };
  } finally {
    await session.close();
  }
}

export async function toggleMindMapNodeCompleted(passphrase: string) {
  const session = getSession();
  try {
    await session.run(
      `MATCH (n:MindMapNode {passphrase: $passphrase})
       SET n.completed = NOT coalesce(n.completed, false)`,
      { passphrase }
    );
  } finally {
    await session.close();
  }
}

export async function updateMindMapNodeImage(passphrase: string, image: string) {
  const session = getSession();
  try {
    await session.run(
      `MATCH (n:MindMapNode {passphrase: $passphrase}) SET n.image = $image`,
      { passphrase, image }
    );
  } finally {
    await session.close();
  }
}

export async function updateMindMapNodeName(passphrase: string, name: string) {
  const session = getSession();
  try {
    await session.run(
      `MATCH (n:MindMapNode {passphrase: $passphrase}) SET n.name = $name`,
      { passphrase, name }
    );
  } finally {
    await session.close();
  }
}

export async function deleteMindMapNode(passphrase: string) {
  const session = getSession();
  try {
    await session.run(
      `MATCH (n:MindMapNode {passphrase: $passphrase}) DETACH DELETE n`,
      { passphrase }
    );
  } finally {
    await session.close();
  }
}

export async function connectMindMapNodes(parentPassphrase: string, childPassphrase: string) {
  const session = getSession();
  try {
    await session.run(
      `MATCH (p:MindMapNode {passphrase: $parent}), (c:MindMapNode {passphrase: $child})
       MERGE (p)-[:HAS_CHILD]->(c)`,
      { parent: parentPassphrase, child: childPassphrase }
    );
  } finally {
    await session.close();
  }
}

export async function disconnectMindMapNodes(parentPassphrase: string, childPassphrase: string) {
  const session = getSession();
  try {
    await session.run(
      `MATCH (p:MindMapNode {passphrase: $parent})-[r:HAS_CHILD]->(c:MindMapNode {passphrase: $child})
       DELETE r`,
      { parent: parentPassphrase, child: childPassphrase }
    );
  } finally {
    await session.close();
  }
}

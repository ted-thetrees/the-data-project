import neo4j from "neo4j-driver";

let _driver: ReturnType<typeof neo4j.driver> | null = null;

function getDriver() {
  if (!_driver) {
    _driver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
    );
  }
  return _driver;
}

export async function getDagData() {
  const session = getDriver().session({ database: process.env.NEO4J_DATABASE });
  try {
    const result = await session.run(`
      MATCH (t:DagTask)
      OPTIONAL MATCH (t)-[:DEPENDS_ON]->(dep:DagTask)
      RETURN t.id AS id, t.text AS text, t.passphrase AS passphrase,
             collect(dep.id) AS dependsOn
    `);

    const nodes: { id: string; text: string; passphrase: string }[] = [];
    const edges: { source: string; target: string }[] = [];
    const seen = new Set<string>();

    for (const record of result.records) {
      const id = record.get("id");
      if (!seen.has(id)) {
        seen.add(id);
        nodes.push({
          id,
          text: record.get("text"),
          passphrase: record.get("passphrase"),
        });
      }
      const deps = record.get("dependsOn") as string[];
      for (const depId of deps) {
        if (depId) {
          edges.push({ source: id, target: depId });
        }
      }
    }

    return { nodes, edges };
  } finally {
    await session.close();
  }
}

export async function createDagTask(
  text: string,
  connectedFromId?: string,
  handleType?: "source" | "target"
) {
  const session = getDriver().session({ database: process.env.NEO4J_DATABASE });
  try {
    // Generate a passphrase
    const words = [
      "amber","azure","brass","cedar","cobalt","coral","crimson","dawn",
      "dusk","ember","flint","frost","golden","harbor","indigo","ivory",
      "jade","lapis","maple","marble","obsidian","opal","pearl","pine",
      "quartz","raven","sage","scarlet","silver","slate","steel","storm",
      "teal","terra","timber","umber","velvet","violet","willow","zinc",
    ];
    const pick = () => words[Math.floor(Math.random() * words.length)];
    const passphrase = `${pick()} ${pick()} ${pick()}`;

    if (connectedFromId) {
      // source handle = dragged from bottom = this node is a dependency
      // the new node DEPENDS_ON the source node
      // target handle = dragged from top = the source node depends on the new node
      if (handleType === "source") {
        const result = await session.run(
          `MATCH (from:DagTask {id: $fromId})
           CREATE (t:DagTask {id: randomUUID(), text: $text, passphrase: $passphrase})
           CREATE (t)-[:DEPENDS_ON]->(from)
           RETURN t.id AS id, t.text AS text, t.passphrase AS passphrase`,
          { fromId: connectedFromId, text, passphrase }
        );
        const rec = result.records[0];
        return { id: rec.get("id"), text: rec.get("text"), passphrase: rec.get("passphrase") };
      } else {
        const result = await session.run(
          `MATCH (from:DagTask {id: $fromId})
           CREATE (t:DagTask {id: randomUUID(), text: $text, passphrase: $passphrase})
           CREATE (from)-[:DEPENDS_ON]->(t)
           RETURN t.id AS id, t.text AS text, t.passphrase AS passphrase`,
          { fromId: connectedFromId, text, passphrase }
        );
        const rec = result.records[0];
        return { id: rec.get("id"), text: rec.get("text"), passphrase: rec.get("passphrase") };
      }
    } else {
      const result = await session.run(
        `CREATE (t:DagTask {id: randomUUID(), text: $text, passphrase: $passphrase})
         RETURN t.id AS id, t.text AS text, t.passphrase AS passphrase`,
        { text, passphrase }
      );
      const rec = result.records[0];
      return { id: rec.get("id"), text: rec.get("text"), passphrase: rec.get("passphrase") };
    }
  } finally {
    await session.close();
  }
}

export async function deleteDagTask(id: string) {
  const session = getDriver().session({ database: process.env.NEO4J_DATABASE });
  try {
    await session.run(`MATCH (t:DagTask {id: $id}) DETACH DELETE t`, { id });
  } finally {
    await session.close();
  }
}

export async function deleteDagEdge(sourceId: string, targetId: string) {
  const session = getDriver().session({ database: process.env.NEO4J_DATABASE });
  try {
    await session.run(
      `MATCH (a:DagTask {id: $sourceId})-[r:DEPENDS_ON]->(b:DagTask {id: $targetId}) DELETE r`,
      { sourceId, targetId }
    );
  } finally {
    await session.close();
  }
}

export async function createDagEdge(sourceId: string, targetId: string) {
  const session = getDriver().session({ database: process.env.NEO4J_DATABASE });
  try {
    await session.run(
      `MATCH (a:DagTask {id: $sourceId}), (b:DagTask {id: $targetId})
       CREATE (a)-[:DEPENDS_ON]->(b)`,
      { sourceId, targetId }
    );
  } finally {
    await session.close();
  }
}

export async function updateDagTaskText(id: string, text: string) {
  const session = getDriver().session({ database: process.env.NEO4J_DATABASE });
  try {
    await session.run(
      `MATCH (t:DagTask {id: $id}) SET t.text = $text`,
      { id, text }
    );
  } finally {
    await session.close();
  }
}

const fs = require("fs");
const MerkleTree = require('merkletreejs')
const helper = require("./helper");

let transaction = Array(10).fill({});
const claim = {};
const claimId = helper.createRandomString(12);
claim["claimId"] = claimId;
claim["hash"] = helper.hash(claimId);
claim["totalVotes"] = 0;
claim["INDORSED"] = 0;
claim["FLAGGED"] = 0;
let i = 0;
transaction = transaction.map(() => {
  i++;
  claim["totalVotes"]++;
  const transactionId = helper.createRandomString(12);
  const status = Math.random() >= 0.5 ? "INDORSED": "FLAGGED";
  claim[status] += 1;
  return {
    transactionId: transactionId,
    hash: helper.hash(transactionId),
    dateTime: new Date(Date.now() + 100 * i),
    status: status
  };
});

if(claim["totalVotes"] < 6) {
  claim["claimStatus"] = "No Consensus";
} else {
  if(claim["INDORSED"] >= claim["FLAGGED"]) {
    claim["claimStatus"] = "INDORSED";
  } else {
    claim["claimStatus"] = "FLAGGED";    
  }
}

createHeapArray(claim, transaction);
function createHeapArray(claim, transactions) {
  console.log("console.log(claim): ", claim);
  console.log("console.log(transactions): ", transactions);
  const hashList = transactions.map(elem => elem.hash);
  hashList.unshift(claim.hash);
  let dataNodes = transactions.map(elem => {
    elem.kind = "transaction";
    return elem;
  });
  claim.kind = "claim";
  claim.hash = claim.hash.toString("utf8");
  dataNodes.unshift(claim);
  console.log("hashList.length: ", hashList);
  const tree = new MerkleTree(hashList, helper.hash, { isBitcoinTree: true });
  const rootHash = tree.getRoot();
  console.log("RootHash: ", rootHash);
  const response = {};
  response.rootHash = rootHash.toString('utf8');
  response.meta = { ...claim, level: 0 };
  response.children = [];
  hashList.forEach(element => {
    addPath(response, tree.getProof(element), dataNodes.filter(elem => elem.hash == element)[0]);    
  });

  fs.writeFile("./object.json", JSON.stringify(response, null, 4), (err) => {
    if (err) {
        console.error(err);
        return;
    };
    console.log("File has been created");
  });
  console.log(response);
}

function addPath(response, pathInTree, node) {
  console.log("pathInTree:", pathInTree);
  node.hash = node.hash.toString("utf8");
  pathInTree.reverse();
  let i = 0;
  let currentLevel = response.children;
  for(i = 0; i < pathInTree.length; i++) {
    if(currentLevel.filter(elem => elem.childHash == pathInTree[i].data.toString('utf8')).length == 0) {
      const object = {};
      object.childHash = pathInTree[i].data.toString('utf8');
      object.meta = {
        level: i + 1
      };
      object.children = [];
      currentLevel.push(object);
    }
    const newObj = currentLevel.filter(elem => pathInTree[i].data.toString('utf8') == elem.childHash)[0];
    if(i == pathInTree.length - 1) {
      node.level = i + 1;
      newObj.meta = node;
    } else {
      newObj.meta.kind = "intermediate";
    }
    currentLevel = newObj.children;
  }
}

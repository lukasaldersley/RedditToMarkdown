const http = new XMLHttpRequest();
var data;
var output = '';
var style = 0;
var escapeNewLine = false;
var spaceComment = false;
var postLoadAdditionalComments = false

const onDocumentReady = () => {
  document.getElementById('url-field').value = getQueryParamUrl();
  if (getFieldUrl()) {
    startExport();
  }
};

const getQueryParamUrl = () => new URLSearchParams(window.location.search).get(
  'url') ?? null;
const getFieldUrl = () => document.getElementById('url-field').value;

function fetchData(url) {
  output = '';

  http.open('GET', `${url}.json`);
  http.responseType = 'json';
  http.send();

  http.onload = function () {
    data = http.response;
    const post = data[0].data.children[0].data;
    const comments = data[1].data.children;
    displayTitle(post);
    output += '\n\n## Comments\n\n';
    comments.forEach((comment) => displayComment(comment, null));

    console.log('Done');
    var ouput_display = document.getElementById('ouput-display');
    var ouput_block = document.getElementById('ouput-block');
    ouput_block.removeAttribute('hidden');
    ouput_display.innerHTML = output;
    download(output, 'output.md', 'text/plain');
  };
}

function loadMoreComments(url, parentid, depthInd) {
  const h2 = new XMLHttpRequest()
  //to allow the newly loaded comments to appear in the correct place, this call has to be synchronous
  h2.open('GET', `${url}/${parentid}.json`, false);
  //setting a desired response type is not supported for non-async calls
  //h2.responseType = 'json';
  h2.send();

  //as a response type cannot be set, the result needs to be parsed to JSON manually.
  const d2 = JSON.parse(h2.responseText)
  const comments = d2[1].data.children[0].data.replies.data.children;
  comments.forEach((comment) => displayComment(comment, depthInd));
}

function setStyle() {
  if (document.getElementById('treeOption').checked) {
    style = 0;
  } else {
    style = 1;
  }

  if (document.getElementById('escapeNewLine').checked) {
    escapeNewLine = true;
  } else {
    escapeNewLine = false;
  }

  if (document.getElementById('spaceComment').checked) {
    spaceComment = true;
  } else {
    spaceComment = false;
  }

  if (document.getElementById('postLoadComments').checked) {
    postLoadAdditionalComments = true;
  } else {
    postLoadAdditionalComments = false;
  }
}

function startExport() {
  console.log('Start exporting');
  setStyle();

  var url = getFieldUrl();
  if (url) {
    fetchData(url);
  } else {
    console.log('No url provided');
  }
}

function download(text, name, type) {
  var a = document.getElementById('a');
  a.removeAttribute('disabled');
  var file = new Blob([text], { type: type });
  a.href = URL.createObjectURL(file);
  a.download = name;
}

function displayTitle(post) {
  output += `# ${post.title}\n`;
  if (post.selftext) {
    output += `\n${post.selftext}\n`;
  }
  output += `\n[permalink](http://reddit.com${post.permalink})`;
  output += `\nby *${post.author}* (↑ ${post.ups}/ ↓ ${post.downs})`;
}

function formatComment(text) {
  if (escapeNewLine) {
    return text.replace(/(\r\n|\n|\r)/gm, '');
  } else {
    return text;
  }
}

function displayComment(comment, preexistingDepth = null) {
  let currentDepth = preexistingDepth != null ? preexistingDepth : comment.data.depth;
  let depthTag
  if (style == 0) {
    if (currentDepth > 0) {
      depthTag = `├${'─'.repeat(currentDepth)} `;
    } else {
      depthTag = `##### `;
    }
  } else {
    if (currentDepth > 0) {
      depthTag = `${'\t'.repeat(currentDepth)}- `;
    } else {
      depthTag = `- `;
    }
  }

  if (comment.data.body) {
    console.log(formatComment(comment.data.body));
    output += `${depthTag}${formatComment(
      comment.data.body)} ⏤ by *${comment.data.author}* (↑ ${comment.data.ups
      }/ ↓ ${comment.data.downs})\n`;
  } else if (comment.kind === "more") {
    let parentID = comment.data.parent_id.substring(3);
    if (postLoadAdditionalComments) {
      loadMoreComments(getFieldUrl(), parentID, currentDepth); ""
    }
    else {
      output += `${depthTag}comment depth-limit (${currentDepth}) reached. [view on reddit](${getFieldUrl()}/${parentID})\n`;
    }
  } else {
    output += `${depthTag}deleted\n`;
  }

  if (comment.data.replies) {
    const subComments = comment.data.replies.data.children;
    subComments.forEach((subComment) => displayComment(subComment, preexistingDepth != null ? preexistingDepth + 1 : null));
  }

  if (currentDepth == 0 && comment.data.replies) {
    if (style == 0) {
      output += '└────\n\n';
    }
    if (spaceComment) {
      output += '\n';
    }
  }
}

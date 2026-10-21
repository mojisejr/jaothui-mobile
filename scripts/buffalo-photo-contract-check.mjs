import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const read = (path) => readFileSync(path, "utf8");
const sources = {
  photo: read("src/components/BuffaloPhoto.tsx"),
  card: read("src/components/BuffaloCard.tsx"),
  detail: read("src/features/certs/CertDetailScreen.tsx"),
  home: read("src/features/home/HomeScreen.tsx"),
};

function elements(source, name) {
  const file = ts.createSourceFile("photo.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const matches = [];
  function walk(node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(file) === name) matches.push(node.getText(file));
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === name) matches.push(node.getText(file));
    ts.forEachChild(node, walk);
  }
  walk(file);
  return matches;
}

function verify({ photo, card, detail, home }) {
  assert.match(photo, /resizeMode="contain"/);
  assert.doesNotMatch(photo, /resizeMode="(?:cover|stretch)"/);
  const insetStyle = photo.match(/inset: \{([\s\S]*?)\n  \},/)?.[1];
  assert.ok(insetStyle);
  assert.match(insetStyle, /padding: spacing\.xxs/);
  assert.match(insetStyle, /backgroundColor: colors\.surface,/);
  assert.match(photo, /<PhotoSource key=\{identity \?\? label\}/);
  assert.match(photo, /layer\.key !== generation\.current/);
  assert.match(photo, /onLoad=\{\(\) => finish\(true\)\}/);
  assert.match(photo, /onError=\{\(\) => finish\(false\)\}/);
  assert.doesNotMatch(photo, /transform:|getSize\(|\.\.\.props/);
  assert.match(photo, /statusSlot: \{ height: spacing\.touchTarget/);
  assert.match(photo, /event\.stopPropagation\(\); retry\(\)/);
  for (const [source, frame, body] of [[card, "imageFrame", "body"], [detail, "heroImageFrame", "titleBlock"]]) {
    assert.match(source, /<BuffaloPhotoFeedback key=\{buffalo\.microchip\}>/);
    assert.match(source, /<BuffaloPhotoStatus \/>/);
    const frames = elements(source, "View").filter((text) => text.startsWith(`<View style={styles.${frame}}>`));
    assert.equal(frames.length, 1);
    assert.match(frames[0], /<BuffaloPhoto uri=\{photo \? photo\.uri : buffalo\.imageUrl\} identity=\{buffalo\.microchip\}/);
    assert.doesNotMatch(frames[0], /ageBadge|<Image/);
    const bodies = elements(source, "View").filter((text) => text.startsWith(`<View style={styles.${body}}>`));
    assert.equal(bodies.length, 1);
    assert.match(bodies[0], /styles\.ageBadge/);
    assert.match(source, /aspectRatio: 3 \/ 2/);
    const frameStyle = source.match(new RegExp(`${frame}: \\{([\\s\\S]*?)\\n  \\},`))?.[1];
    assert.ok(frameStyle);
    assert.match(frame === "imageFrame" ? source : frameStyle, /borderRadius: radius\.photo/);
    assert.match(frame === "imageFrame" ? source : frameStyle, /borderColor: colors\.photoHairline/);
    assert.doesNotMatch(frame === "imageFrame" ? source : frameStyle, /\.\.\.shadow\.gold/);
    assert.match(frameStyle, /backgroundColor: colors\.surface,/);
    const ageStyle = source.match(/ageBadge: \{([\s\S]*?)\n  \},/)?.[1];
    assert.ok(ageStyle);
    assert.doesNotMatch(ageStyle, /borderWidth|backgroundColor|paddingHorizontal/);
  }
  assert.match(card, /memo\(BuffaloCardComponent\)/);
  assert.match(card, /<Pressable style=\{styles\.card\} onPress=\{onPress\}/);
  assert.match(card, /minWidth: 0/);
  assert.match(card, /flexBasis: "45%"/);
  assert.doesNotMatch(card, /position: "absolute"/);
  assert.match(detail, /uri: certificateImageUri[^\n]*resizeMode="contain"/);
  const skeletonCard = home.match(/skeletonFeatureCard: \{([\s\S]*?)\n  \},/)?.[1];
  assert.ok(skeletonCard);
  for (const required of [/flexBasis: "45%"/, /flexGrow: 1/, /flexShrink: 1/, /minWidth: 0/]) assert.match(skeletonCard, required);
  assert.doesNotMatch(skeletonCard, /\bflex: 1/);
  assert.match(home, /<Skeleton variant="image" style=\{styles\.skeletonFeatureImage\}/);
  assert.match(home, /skeletonFeatureImage: \{\s*aspectRatio: 3 \/ 2/);
  assert.match(home, /<Skeleton style=\{styles\.skeletonFeatureAge\}/);
}

verify(sources);
const mutants = [
  { ...sources, photo: sources.photo.replace('resizeMode="contain"', 'resizeMode="cover"') },
  { ...sources, photo: sources.photo.replace("padding: spacing.xxs", "padding: 0") },
  { ...sources, photo: sources.photo.replace("backgroundColor: colors.surface,", "backgroundColor: colors.surfaceRaised,") },
  { ...sources, card: sources.card.replace("borderRadius: radius.photo", "borderRadius: radius.card") },
  { ...sources, card: sources.card.replace("aspectRatio: 3 / 2", "aspectRatio: 4 / 3") },
  { ...sources, card: sources.card.replace('alignSelf: "flex-start",', 'alignSelf: "flex-start", borderWidth: 1,') },
  { ...sources, detail: sources.detail.replace("aspectRatio: 3 / 2", "aspectRatio: 4 / 3") },
  { ...sources, home: sources.home.replace("aspectRatio: 3 / 2", "aspectRatio: 4 / 3") },
  { ...sources, photo: sources.photo.replace('key={identity ?? label}', 'key="fixed"') },
  { ...sources, card: sources.card.replace("minWidth: 0", "minWidth: 150") },
  { ...sources, card: sources.card.replace("style={styles.body}", "style={styles.imageFrame}") },
  { ...sources, detail: sources.detail.replace("<BuffaloPhoto uri={photo ? photo.uri : buffalo.imageUrl}", "<Image source={buffalo.imageUrl}") },
  { ...sources, home: sources.home.replace("minWidth: 0", "minWidth: 150") },
  { ...sources, home: sources.home.replace('flexBasis: "45%"', "flex: 1") },
];
for (const [index, mutant] of mutants.entries()) assert.throws(() => verify(mutant), `Policy mutant ${index + 1} must be rejected`);
const list = read("src/features/buffalos/BuffaloListScreen.tsx");
for (const required of ["<FlatList", "keyExtractor={keyExtractor}", "numColumns={2}", "initialNumToRender={6}", "maxToRenderPerBatch={6}", "windowSize={5}"]) assert.ok(list.includes(required));
for (const path of ["src/features/home/HomeScreen.tsx", "src/features/buffalos/BuffaloListScreen.tsx", "src/features/profile/ProfileShell.tsx"]) assert.match(read(path), /<BuffaloCard/);
assert.match(read("src/features/home/NewsEventRail.tsx"), /uri: item\.coverImageUrl[^\n]*resizeMode="cover"/);
assert.match(read("src/features/profile/ProfileShell.tsx"), /uri: avatarUrl[^\n]*resizeMode="cover"/);
assert.match(read("src/features/home/HomeScreen.tsx"), /<ImageBackground[^\n]*resizeMode="cover"/);
assert.equal(JSON.parse(read("app.json")).expo.version, JSON.parse(read("package.json")).version);
console.log(`Buffalo photo native contract passed; ${mutants.length} policy mutants rejected; non-buffalo policies and virtualization preserved`);

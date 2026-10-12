import fs from "node:fs";
import path from "node:path";
function exists(root, relative) {
    return fs.existsSync(path.join(root, relative));
}
function readIfExists(file) {
    try {
        return fs.readFileSync(file, "utf8");
    }
    catch {
        return "";
    }
}
function hasText(root, file, terms) {
    const content = readIfExists(path.join(root, file));
    return terms.find(term => content.toLowerCase().includes(term.toLowerCase()));
}
export function analyzeProject(project) {
    const root = project.path;
    const signals = [];
    const add = (key, category, value, evidence) => signals.push({ key, category, value, evidence });
    if (exists(root, "settings.gradle") || exists(root, "settings.gradle.kts") ||
        exists(root, "build.gradle") || exists(root, "build.gradle.kts")) {
        add("gradle", "build", "Gradle", "Gradle build/settings file detected");
    }
    const files = [];
    function scan(dir, depth = 0) {
        if (depth > 4)
            return;
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            if (e.name.startsWith(".") || ["node_modules", "build", "dist"].includes(e.name))
                continue;
            const p = path.join(dir, e.name);
            if (e.isDirectory())
                scan(p, depth + 1);
            else
                files.push(p);
        }
    }
    scan(root);
    if (files.some(f => /\.kt$/.test(f))) {
        add("kotlin", "language", "Kotlin", "Kotlin source files detected");
    }
    if (files.some(f => /\.java$/.test(f))) {
        add("java", "language", "Java", "Java source files detected");
    }
    if (files.some(f => /\.ts$/.test(f))) {
        add("typescript", "language", "TypeScript", "TypeScript source files detected");
    }
    if (files.some(f => /\.tsx$/.test(f))) {
        add("typescript-react", "framework", "React/TypeScript", "TSX source files detected");
    }
    if (files.some(f => /\.(js|mjs|cjs)$/.test(f))) {
        add("javascript", "language", "JavaScript", "JavaScript source files detected");
    }
    if (files.some(f => /\.html?$/.test(f))) {
        add("html", "framework", "HTML", "HTML source files detected");
    }
    if (files.some(f => /\.css$/.test(f))) {
        add("css", "framework", "CSS", "CSS source files detected");
    }
    if (exists(root, "AndroidManifest.xml") ||
        files.some(f => f.endsWith("src/main/AndroidManifest.xml"))) {
        add("android", "platform", "Android", "AndroidManifest.xml detected");
    }
    const gradleFiles = files.filter(f => /\.gradle(\.kts)?$/.test(f));
    for (const file of gradleFiles) {
        const content = readIfExists(file);
        if (/com\.android\.application|com\.android\.library/.test(content)) {
            add("android-gradle", "platform", "Android Gradle Plugin", `${path.relative(root, file)} declares Android plugin`);
            break;
        }
    }
    const allGradle = gradleFiles.map(readIfExists).join("\n");
    if (/androidx\.compose|compose\./.test(allGradle)) {
        add("compose", "framework", "Jetpack Compose", "Compose dependency/plugin signal detected");
    }
    if (/androidx\.room|room-runtime|room-ktx/.test(allGradle)) {
        add("room", "dependency", "Room", "Room dependency detected");
    }
    if (/com\.google\.dagger|hilt-android|hilt-compiler/.test(allGradle)) {
        add("hilt", "dependency", "Hilt", "Hilt dependency detected");
    }
    if (exists(root, "pom.xml")) {
        add("maven", "build", "Maven", "pom.xml detected");
        const pom = readIfExists(path.join(root, "pom.xml"));
        if (/<spring-boot-starter|spring-boot-maven-plugin/.test(pom)) {
            add("spring-boot", "framework", "Spring Boot", "Spring Boot dependency/plugin detected");
        }
    }
    const packageJson = readIfExists(path.join(root, "package.json"));
    if (packageJson) {
        add("node", "platform", "Node.js", "package.json detected");
        if (/"angular"|@angular\//.test(packageJson)) {
            add("angular", "framework", "Angular", "Angular dependency detected");
        }
    }
    const hasSrc = exists(root, "src");
    const hasTests = files.some(f => /(^|[/\\])(test|tests|__tests__|src\/test)[/\\]/.test(f));
    if (hasSrc)
        add("src-structure", "structure", "src-directory", "src directory detected");
    if (hasTests)
        add("tests", "structure", "tests", "Test source/directory detected");
    if (files.some(f => /(^|[/\\])(domain|data|presentation|ui|repository|repositories)[/\\]/.test(f))) {
        add("layered-structure", "architecture", "Layered architecture signal", "Common architectural layer directories detected");
    }
    return {
        projectId: project.id,
        projectName: project.name,
        rootPath: root,
        signals
    };
}

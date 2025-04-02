/**
 * Sample React Native Static Server
 * https://github.com/futurepress/react-native-static-server
 * @flow
 */

import React, { useState, useEffect } from "react"
import { Platform, StyleSheet, View } from "react-native"

// requires react-native-webview, see: https://github.com/uuidjs/uuid#getrandomvalues-not-supported
// import 'react-native-get-random-values'
import StaticServer from "react-native-static-server"
import RNFetchBlob from "rn-fetch-blob"
import { WebView } from "react-native-webview"
import RNFS from "react-native-fs"
import * as SplashScreen from "expo-splash-screen"
import SystemNavigationBar from "react-native-system-navigation-bar"

interface ITestViewProps {
  port?: number
  root?: string
  file?: string
  target?: any
}

const removeSplashScreenAnimation = () => {
  if (Platform.OS === "android") {
    SplashScreen.setOptions({ duration: 0 })
  }
}

removeSplashScreenAnimation()

async function copyRecursive(source: string, destination: string) {
  console.log(`${source} => ${destination}`)
  // reads items from source directory
  const items = await RNFS.readDirAssets(source)

  // creates destination directory
  console.log(`Output directory: ${destination}`)
  await RNFS.mkdir(destination)

  // for each item
  await items.forEach(async (item) => {
    //  checks if it is a file
    if (item.isFile() === true) {
      console.log(`Input file: ${item.path}`)
      const destinationFile = destination + "/" + item.name

      // copies file
      console.log(`Output file: ${destinationFile}`)
      try {
        await RNFS.copyFileAssets(item.path, destinationFile)
        console.log(`Copied: ${item.path} -> ${destinationFile}`)
      } catch (e) {
        console.error(`Failed to copy ${item.path}: ${e.message}`)
      }
    } else {
      console.log(`Input directory: ${item.path}`)

      const subDirectory = source + "/" + item.name
      const subDestinationDirectory = destination + "/" + item.name

      await copyRecursive(subDirectory, subDestinationDirectory)
    }
  })
}

const copyFilesToLocalStorage = async () => {
  const sourcePath = RNFetchBlob.fs.dirs.MainBundleDir + "/game" // Path to the folder in the bundle
  const targetPath = `${RNFetchBlob.fs.dirs.DocumentDir}/game` // Path in the device's storage

  try {
    // Check if the target folder exists
    const exists = await RNFetchBlob.fs.isDir(targetPath)
    if (!exists) {
      await RNFetchBlob.fs.mkdir(targetPath)
    }

    // List files in the source directory
    const files = await RNFetchBlob.fs.ls(sourcePath)

    // Copy each file to the target directory
    for (const file of files) {
      const srcFilePath = `${sourcePath}/${file}`
      const destFilePath = `${targetPath}/${file}`
      try {
        await RNFetchBlob.fs.cp(srcFilePath, destFilePath)
      } catch (error) {
        /** IGNORE */
      }
    }

    console.log("All files copied successfully!")
  } catch (error) {
    console.error("Error copying files:", error)
  }
}

const copyFilesToLocalStorageAndroid = async () => {
  const sourcePath = "game" // Path to the folder in the bundle
  const targetPath = `${RNFetchBlob.fs.dirs.DocumentDir}/game` // Path in the device's storage

  try {
    // Check if the target folder exists
    const exists = await RNFetchBlob.fs.isDir(targetPath)
    if (!exists) {
      await RNFetchBlob.fs.mkdir(targetPath)
    }

    // List files in the source directory
    const files = await RNFS.readDirAssets(sourcePath)
    console.log({ files })
    await copyRecursive(sourcePath, targetPath)
    const ls = await RNFetchBlob.fs.ls(RNFetchBlob.fs.dirs.DocumentDir + "/game")
    console.log({ ls })
    console.log("All files copied successfully!")
  } catch (error) {
    console.error("Error copying files:", error)
  }
}

const copyFilesToLocalStorageIOS = async () => {
  const sourcePath = `${RNFetchBlob.fs.dirs.MainBundleDir}/game` // Path to the folder in the bundle
  const targetPath = `${RNFetchBlob.fs.dirs.DocumentDir}/game` // Path in the device's storage

  console.log({ sourcePath, targetPath })
  try {
    // Check if the target folder exists
    const exists = await RNFetchBlob.fs.isDir(targetPath)
    if (!exists) {
      await RNFetchBlob.fs.mkdir(targetPath)
    }

    // List files in the source directory
    const files = await RNFetchBlob.fs.ls(sourcePath)
    const targetPathFiles = await RNFetchBlob.fs.ls(targetPath)
    console.log("files", files)
    console.log("targetPathFiles", targetPathFiles)

    // Copy each file to the target directory
    for (const file of files) {
      const srcFilePath = `${sourcePath}/${file}`
      const destFilePath = `${targetPath}/${file}`
      try {
        await RNFetchBlob.fs.cp(srcFilePath, destFilePath)
      } catch (error) {
        /** IGNORE */
        console.log({ error })
      }
    }

    console.log("All files copied successfully!")
  } catch (error) {
    console.log("Error copying files:", error)
  }
}

export function Game(props: ITestViewProps): JSX.Element {
  const [origin, setOrigin] = useState<string>("")
  const [server, setServer] = useState<StaticServer>(null)
  const port = typeof props.port !== "undefined" ? props.port : 0
  const root = typeof props.root !== "undefined" ? props.root : "game/"
  const file = typeof props.file !== "undefined" ? props.file : "index.html"

  useEffect(() => {
    if (origin === "") {
      const startServer = async (): Promise<void> => {
        const newServer = new StaticServer(port, root, { localOnly: true })
        // console.log({ newServer })
        const origin = await newServer.start()
        // console.log({ origin })
        setOrigin(origin)
        setServer(newServer)
      }

      const prepare = async (): Promise<void> => {
        try {
          if (Platform.OS === "ios") {
            await copyFilesToLocalStorageIOS()
          }
          if (Platform.OS === "android") {
            await copyFilesToLocalStorageAndroid()
          }
        } catch (e) {
          console.log(e)
        }
        await startServer()
      }
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      prepare()
      return () => {
        if (server !== null) {
          server.kill()
        }
      }
    }
  }, [])

  useEffect(() => {
    SystemNavigationBar.stickyImmersive()
  }, [])

  const handleLoadEnd = () => {
    setTimeout(() => SplashScreen.hideAsync(), 800)
  }

  if (origin === "") {
    return <View />
  }

  console.log({ origin: `${origin}/${file}` })
  return (
    <WebView
      source={{ uri: `${origin}/${file}` }}
      style={styles.webview}
      javaScriptEnabled={true}
      originWhitelist={["*"]}
      allowFileAccess={true}
      allowFileAccessFromFileURLs
      cacheEnabled
      onLoadEnd={handleLoadEnd}
      onHttpError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent
        console.warn("WebView received error status code: ", nativeEvent.statusCode)
        console.warn("WebView received error description: ", nativeEvent.description)
      }}
      onError={(e) => console.log("onError", e)}
    />
  )
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
  },
})

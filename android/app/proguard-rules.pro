# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in @{sdk.dir}/tools/proguard/proguard-android.txt
#
# ---------------------------------------------------------------------------
# SECURITY (MOB-9): R8 shrinking/obfuscation is enabled via
# android.enableProguardInReleaseBuilds in gradle.properties.
#
# READ THIS BEFORE ADDING A DEPENDENCY. R8 strips anything it cannot see being used.
# Native modules, reflection and JSON deserialization are all invisible to it, so a
# missing rule here does not fail the build — it crashes the app at runtime, usually on
# launch, and only a new store build can fix it. If you add a library that uses JNI,
# reflection, annotations or Gson/Jackson, add a keep rule AND smoke-test a release build.
# ---------------------------------------------------------------------------

# --- React Native core / new architecture -------------------------------------------
# JNI and TurboModule entry points are resolved by name from C++.
-keep,includedescriptorclasses class com.facebook.react.bridge.** { *; }
-keep,includedescriptorclasses class com.facebook.react.turbomodule.** { *; }
-keep,includedescriptorclasses class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.fabric.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.proguard.annotations.** { *; }
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.proguard.annotations.KeepGettersAndSetters *;
    @com.facebook.common.internal.DoNotStrip *;
}
# Anything invoked from JS via @ReactMethod, and native module registration.
-keepclassmembers class * { @com.facebook.react.bridge.ReactMethod <methods>; }
-keep class * extends com.facebook.react.bridge.NativeModule { *; }
-keep class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }
-keep class * implements com.facebook.react.ReactPackage { *; }
-keep class * extends com.facebook.react.uimanager.ViewManager { *; }

# --- Expo modules --------------------------------------------------------------------
# expo-modules-core resolves module definitions reflectively by class name.
-keep class expo.modules.** { *; }
-keep class * extends expo.modules.kotlin.modules.Module { *; }
-keepclassmembers class * { @expo.modules.core.interfaces.ExpoMethod <methods>; }
# expo-updates reads its config via reflection and manifest meta-data.
-keep class expo.modules.updates.** { *; }

# --- Reanimated / gesture handler / screens ------------------------------------------
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }

# --- Networking: OkHttp / Okio / socket.io -------------------------------------------
# Socket.IO and Engine.IO use reflection for event dispatch.
-keep class io.socket.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
-keepclassmembers class okhttp3.** { *; }

# --- Sentry ---------------------------------------------------------------------------
# Stack traces must stay meaningful, and Sentry loads integrations reflectively.
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**
-keepattributes LineNumberTable,SourceFile

# --- Maps / SVG / Lottie / WebView ----------------------------------------------------
-keep class com.google.android.gms.maps.** { *; }
-keep class com.rnmaps.maps.** { *; }
-keep class com.horcrux.svg.** { *; }
-keep class com.airbnb.lottie.** { *; }
-keep class com.reactnativecommunity.webview.** { *; }

# --- Security / storage ---------------------------------------------------------------
-keep class androidx.security.crypto.** { *; }
-keep class androidx.biometric.** { *; }
-dontwarn javax.annotation.**

# --- Serialization --------------------------------------------------------------------
# Generic signatures and annotations must survive or Gson/Jackson-style reflection breaks.
-keepattributes Signature,InnerClasses,EnclosingMethod
-keepattributes *Annotation*,RuntimeVisibleAnnotations,AnnotationDefault
-keep @androidx.annotation.Keep class * { *; }
-keepclassmembers class * { @androidx.annotation.Keep *; }
# Enum values() / valueOf() are called reflectively by several libraries.
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
# Parcelable CREATOR fields are looked up by name.
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}
